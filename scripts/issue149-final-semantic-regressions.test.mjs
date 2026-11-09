import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import ts from 'typescript'
import { auditSentence } from './audit-language-quality.mjs'

const source=readFileSync(new URL('../src/language-annotations.ts',import.meta.url),'utf8')
const compiled=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText
const client=await import('data:text/javascript;base64,'+Buffer.from(compiled).toString('base64'))

function highlights(term,language='en',saved=[]) {
  return client.getLanguageHighlights({term,language,highlight_json:JSON.stringify(saved)})
}

test('source generator preserves complete meanings of four first-120 examples',()=>{
  const code=String.raw`
import importlib.util
from pathlib import Path
spec=importlib.util.spec_from_file_location("qa149",str(Path("scripts/generate_language_sentence_seed.py").resolve()))
gen=importlib.util.module_from_spec(spec);spec.loader.exec_module(gen)
j1="代わりにダイアルしていただけませんか？電話の位置が高すぎて。"
j2="できるだけ早くお見積書をいただけますようにお願いします。"
e1="No. I apologise, but I need to leave a bit early."
e2="If you would like to speak to a customer service representative, please press three."
for sentence,desired in ((j1,"代わりに"),(j2,"ようにお願いします"),(e1,"a bit"),(e2,"a customer service representative")):
 lang="ja" if sentence in (j1,j2) else "en"
 hits=gen.make_hits(sentence,lang)
 assert any(h["term"].casefold()==desired.casefold() for h in hits),(sentence,desired,hits)
 assert not any(h["term"]=="に" for h in hits) if sentence in (j1,j2) else True
 if sentence==e1:
  assert all("名词短语" not in h["meaning"] for h in hits if h["term"].casefold()=="a bit"),hits
 if sentence==e2:
  assert not any(h["term"].casefold()=="a customer" for h in hits),hits
s="I found a bit of luck today."
assert not any(h["term"]=="a bit" and h["type"]=="vocabulary" for h in gen.make_hits(s,"en"))
assert any(h["term"]=="代わりに" for h in gen.make_hits("彼の代わりに電話します。","ja"))
`;
  const result=spawnSync('python3',['-c',code],{encoding:'utf8',timeout:60000})
  assert.equal(result.status,0,[result.stdout,result.stderr].filter(Boolean).join('\n'))
})

test('browser corrects misleading legacy glosses instead of keeping cropped phrases',()=>{
  const invalid=[
    ['No. I apologise, but I need to leave a bit early.','a bit','grammar','完整名词短语'],
    ['If you would like to speak to a customer service representative, please press three.','a customer','grammar','完整名词短语'],
    ['代わりにダイアルしていただけませんか？','に','grammar','助词「に」：目标／时间／对象'],
    ['お見積書をいただけますようにお願いします。','に','grammar','助词「に」：目标／时间／对象'],
  ]
  for(const [sentence,word,type,meaning] of invalid){
    const language=/[^\x00-\x7f]/.test(sentence)?'ja':'en'
    const start=sentence.indexOf(word)
    const stored={start,end:start+word.length,term:word,type,meaning,explanation:'misleading legacy highlight'}
    const hits=highlights(sentence,language,[stored])
    assert.ok(!hits.some(h=>h.term===word && h.type===type),JSON.stringify({sentence,hits}))
  }
  const degree=highlights('I need to leave a bit early.')
  assert.ok(degree.some(h=>h.term==='a bit' && /稍微/.test(h.meaning)),JSON.stringify(degree))
  const compound=highlights('Talk to a customer service representative.')
  assert.ok(compound.some(h=>h.term==='customer service representative'),JSON.stringify(compound))
  const partitive=highlights('I need a bit of luck.')
  assert.ok(!partitive.some(h=>h.term==='a bit' && h.type==='vocabulary'),JSON.stringify(partitive))
})

function example(sentence,language,term,meaning,type='grammar') {
  const start=sentence.indexOf(term)
  const note={start,end:start+term.length,term,type,meaning,explanation:'bad source-gloss shortcut'}
  const other={start:0,end:1,term:sentence[0],type:'vocabulary',meaning:'test',explanation:'test'}
  return {
    id:language+'-qa',term:sentence,language,content_type:'sentence',category:'日常句子',
    meaning_zh:'测试翻译',source_type:'licensed',source_url:'https://tatoeba.org/en/sentences/show/123',
    highlight_json:JSON.stringify([other,note]),
    grammar_expansion_json:JSON.stringify(type==='grammar'?[{term,meaning,explanation:'bad source-gloss shortcut'}]:[{term:'test',meaning:'test',explanation:'test'}]),
    vocabulary_expansion_json:JSON.stringify([{term:other.term,meaning:'test',explanation:'test'}])
  }
}

test('offline quality gate fails closed on four verified first-120 semantic errors',()=>{
  const rows=[
    ['代わりに電話する。','ja','に','助词「に」：目标／时间／对象'],
    ['届きますようにお願いします。','ja','に','助词「に」：目标／时间／对象'],
    ['I left a bit early.','en','a bit','完整名词短语'],
    ['Talk to a customer service representative.','en','a customer','完整名词短语']
  ]
  for(const [sentence,lang,term,meaning] of rows){
    const r=auditSentence(example(sentence,lang,term,meaning),'en'===lang?'en':'ja')
    assert.ok(r.errors.some(e=>/名词短语|customer service|代わりに|ようにお願いします|a bit \+ degree/.test(e)),JSON.stringify({sentence,result:r}))
  }
})
