import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import ts from 'typescript'
import { auditSentence } from './audit-language-quality.mjs'

const source=readFileSync(new URL('../src/language-annotations.ts',import.meta.url),'utf8')
const js=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText
const frontend=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'))
function clientHighlights(sentence,language){
  return frontend.getLanguageHighlights({term:sentence,language,highlight_json:'[]'})
}

test('source generator abstains from documented false contextual grammar and keeps true usages',()=>{
  const code=String.raw`
import importlib.util
from pathlib import Path
spec=importlib.util.spec_from_file_location("language_regression",str(Path("scripts/generate_language_sentence_seed.py").resolve()))
gen=importlib.util.module_from_spec(spec);spec.loader.exec_module(gen)
bad=[
 ("時のたつのは早いものだ。","ja","のだ"),
 ("人生はそういうものです。","ja","のです"),
 ("What more would you want?","en","would you"),
 ("What could you make?","en","could you"),
 ("What'll you have to drink?","en","have to"),
 ("The need to collect water is urgent.","en","need to"),
 ("He is used to teamwork.","en","used to"),
 ("The tool may be used to evaluate data.","en","used to"),
 ("We have to go.","en","We have"),
 ("I don't have to go to work.","en","have to"),
 ("Peter doesn't need to attend the meeting.","en","need to"),
 ("He is used to traveling.","en","used"),
 ("Youths who are caught breaking rules will be disciplined.","en","who are"),
]
good=[
 ("だからやるのだ。","ja","のだ"),
 ("Would you close the window?","en","would you"),
 ("Could you confirm the schedule?","en","could you"),
 ("We have to go.","en","have to"),
 ("I need to configure this.","en","need to"),
 ("Tom used to live here.","en","used to"),
 ("I don't have to go to work.","en","don't have to"),
 ("Peter doesn't need to attend the meeting.","en","doesn't need to"),
]
for sentence,lang,target in bad:
  hits=gen.make_hits(sentence,lang)
  assert not any(x["term"].casefold()==target for x in hits),(sentence,hits)
for sentence,lang,target in good:
  hits=gen.make_hits(sentence,lang)
  assert any(x["term"].casefold()==target for x in hits),(sentence,hits)
`
  const r=spawnSync('python3',['-c',code],{encoding:'utf8',timeout:60000})
  assert.equal(r.status,0,[r.stdout,r.stderr].filter(Boolean).join('\n'))
})

test('browser filters misleading old D1 highlights and still recognizes true patterns',()=>{
  const bad=[
    ['ja','時のたつのは早いものだ。','のだ'],
    ['en','What more would you want?','would you'],
    ['en','What could you make?','could you'],
    ['en',"What'll you have to drink?",'have to'],
    ['en','The need to collect water is urgent.','need to'],
    ['en','He is used to teamwork.','used to'],
    ['en','He is used to traveling.','used'],
    ['en',"I don't have to go to work.",'have to'],
    ['en',"Peter doesn't need to attend the meeting.",'need to'],
  ]
  for(const [language,sentence,term] of bad){
    const offset=sentence.toLocaleLowerCase().lastIndexOf(term)
    assert.ok(offset>=0,sentence)
    for(const type of ['grammar','vocabulary']){
      const stale={start:offset,end:offset+term.length,term:sentence.slice(offset,offset+term.length),
        type,meaning:'错误语义',explanation:'旧题库误标'}
      const hits=frontend.getLanguageHighlights({term:sentence,language,
        highlight_json:JSON.stringify([stale])})
      assert.ok(!hits.some(x=>x.term.toLocaleLowerCase()===term),
        'stale highlight leaked in '+sentence+' ('+type+')')
    }
  }
  for(const [language,sentence,term] of [
    ['en','Would you close the window?','would you'],
    ['en','Tom used to live here.','used to'],
    ['en',"I don't have to go to work.", "don't have to"],
    ['en',"Peter doesn't need to attend the meeting.", "doesn't need to"],
  ]) assert.ok(clientHighlights(sentence,language).some(x=>x.term.toLocaleLowerCase()===term),sentence)
})

test('quality gate rejects a false old grammar highlight with correct Unicode offsets',()=>{
  function sentence(text,language,term){
    const offset=text.toLocaleLowerCase().lastIndexOf(term)
    const hit={start:offset,end:offset+term.length,type:'grammar',term:text.slice(offset,offset+term.length),
      meaning:'错误',explanation:'错误标注'}
    const vocab={start:0,end:Math.min(2,text.length),type:'vocabulary',term:text.slice(0,Math.min(2,text.length)),
      meaning:'词义',explanation:'词汇'}
    return {id:language+'-test',term:text,language,content_type:'sentence',category:'日常句子',
      meaning_zh:'用于测试的中文含义',source_type:'licensed',
      source_url:'https://tatoeba.org/en/sentences/show/123',
      highlight_json:JSON.stringify([vocab,hit]),
      grammar_expansion_json:JSON.stringify([{term:hit.term,meaning:hit.meaning,explanation:hit.explanation}]),
      vocabulary_expansion_json:JSON.stringify([{term:vocab.term,meaning:vocab.meaning,explanation:vocab.explanation}])}
  }
  const first=sentence('時のたつのは早いものだ。','ja','のだ')
  assert.match(auditSentence(first,'ja').errors.join(' / '),/ものだ/)
  const second=sentence("What'll you have to drink?",'en','have to')
  assert.match(auditSentence(second,'en').errors.join(' / '),/ambiguous have to/)
})

test('first-120 real-source fragments abstain but retain genuine grammatical constructions',()=>{
  const code=String.raw`
import importlib.util
from pathlib import Path
spec=importlib.util.spec_from_file_location("first_120",str(Path("scripts/generate_language_sentence_seed.py").resolve()))
gen=importlib.util.module_from_spec(spec);spec.loader.exec_module(gen)
checks=[
 ("わからない言葉があればすぐに辞書で調べる。","ja",("から","あれ")),
 ("どうやって説明すればいいかわからない。","ja",("から",)),
 ("1時間ほどお待ちいただけますか？","ja",("だけ",)),
 ("代わりにダイアルしていただけませんか？","ja",("だけ",)),
 ("今日はとても忙しいから一緒に行けないの。","ja",("と",)),
 ("私は帰国してからとても忙しい。","ja",("と",)),
 ("Youths who are caught violating rules will lose their right.","en",("who are",)),
]
for sentence,lang,forbidden in checks:
 hits=gen.make_hits(sentence,lang)
 assert not any(x["term"].casefold() in forbidden for x in hits),(sentence,hits)
nominal=gen.make_hits("夢を見るのはただだよ。","ja")
assert any(x["term"]=="の" and "名词化" in x["meaning"] for x in nominal),nominal
ending=gen.make_hits("その自信はどこから来るの？","ja")
assert any(x["term"]=="の" and "句末" in x["meaning"] for x in ending),ending
full=gen.make_hits("It's not fair! I have to do the hard work!","en")
assert not any(x["term"].casefold()=="the hard" for x in full),full
assert any(x["term"].casefold()=="the hard work" for x in full),full
`
  const result=spawnSync('python3',['-c',code],{encoding:'utf8',timeout:60000})
  assert.equal(result.status,0,[result.stdout,result.stderr].filter(Boolean).join('\n'))
})
