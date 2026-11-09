import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import ts from 'typescript'
import { auditSentence } from './audit-language-quality.mjs'

const source=readFileSync(new URL('../src/language-annotations.ts',import.meta.url),'utf8')
const compiled=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText
const frontend=await import('data:text/javascript;base64,'+Buffer.from(compiled).toString('base64'))

test('source generator rejects audited false particle boundaries and retains true particles',()=>{
  const program=String.raw`
import importlib.util
from pathlib import Path
spec=importlib.util.spec_from_file_location("source_149",str(Path("scripts/generate_language_sentence_seed.py").resolve()))
gen=importlib.util.module_from_spec(spec);spec.loader.exec_module(gen)
bad=[
 ("今日は朝から出かけるのでPCはチェックできないから携帯の方にメール送って。","で"),
 ("もう一歩で君は階段から落ちていただろう。","で"),
 ("生きる上で大事なことは、愛情と仕事だけだ。","で"),
 ("私はあと二日でフランスへと出発する予定だった。","で"),
 ("私はあと二日でフランスへと出発する予定だった。","と"),
 ("天気予報では明日午後から雨だ。","で"),
]
for sentence,term in bad:
 hits=gen.make_hits(sentence,"ja")
 assert not any(h["term"]==term for h in hits),(sentence,term,hits)
for sentence,term in [
 ("学校で勉強する。","で"),
 ("本とノートを買う。","と"),
 ("机の上で本を読む。","で"),
]:
 assert any(h["term"]==term for h in gen.make_hits(sentence,"ja")),(sentence,term)
sentence="「またトムから電話？」「毎晩かかってくるの。番号教えるんじゃなかった」"
hits=gen.make_hits(sentence,"ja")
assert any(h["term"]=="の" and "句末" in h["meaning"] for h in hits),(sentence,hits)
`
  const run=spawnSync('python3',['-c',program],{encoding:'utf8',timeout:60000})
  assert.equal(run.status,0,[run.stdout,run.stderr].filter(Boolean).join('\n'))
})

test('client refuses wrong legacy particle glosses but preserves valid usage and sentence-final の',()=>{
  const reject=[
    ['今日は朝からPCをチェックできない。','で'],
    ['もう一歩で落ちるところだった。','で'],
    ['生きる上で大切なこと。','で'],
    ['私は二日でフランスへと出発する。','と'],
    ['天気予報では雨が降る。','で'],
  ]
  for(const [sentence,term] of reject){
    const start=sentence.lastIndexOf(term)
    const stale={start,end:start+term.length,term,type:'grammar',meaning:'动作地点／手段',explanation:'错误的旧解释'}
    const hits=frontend.getLanguageHighlights({term:sentence,language:'ja',highlight_json:JSON.stringify([stale])})
    assert.ok(!hits.some(x=>x.start===start && x.term===term),'stale misleading marker '+sentence)
  }
  for(const [sentence,term] of [['学校で勉強する。','で'],['母と話す。','と']]){
    const hits=frontend.getLanguageHighlights({term:sentence,language:'ja',highlight_json:'[]'})
    assert.ok(hits.some(x=>x.term===term),'valid particle lost '+sentence)
  }
  const sentence='「また電話？」「毎晩かかってくるの。番号教えなきゃよかった」'
  const start=sentence.indexOf('の。')
  const stale={start,end:start+1,term:'の',type:'grammar',meaning:'连接名词／所属',explanation:'旧版句尾误标'}
  const hits=frontend.getLanguageHighlights({term:sentence,language:'ja',highlight_json:JSON.stringify([stale])})
  assert.ok(hits.some(x=>x.start===start && x.term==='の' && /句末/.test(x.meaning)),JSON.stringify(hits))
})

test('offline gate fails on confirmed old sense errors rather than counting them as semantically verified',()=>{
  function card(sentence,term,meaning){
    const start=sentence.indexOf(term)
    const hit={start,end:start+term.length,term,type:'grammar',meaning,explanation:'错误的旧解释'}
    const vocab={start:0,end:1,term:sentence.slice(0,1),type:'vocabulary',meaning:'测试词',explanation:'测试词汇'}
    return {id:'ja-test',language:'ja',content_type:'sentence',category:'日常句子',term:sentence,meaning_zh:'测试译文',
      source_type:'licensed',source_url:'https://tatoeba.org/en/sentences/show/123',
      highlight_json:JSON.stringify([vocab,hit]),
      grammar_expansion_json:JSON.stringify([{term,meaning,explanation:'错误的旧解释'}]),
      vocabulary_expansion_json:JSON.stringify([{term:vocab.term,meaning:'测试词',explanation:'测试词汇'}])}
  }
  for(const [sentence,term,meaning] of [
    ['チェックできない','で','动作地点／手段'],
    ['もう一歩で落ちる','で','动作地点／手段'],
    ['海へと向かう','と','共同对象／引用'],
    ['生きる上で大切','で','动作地点／手段'],
    ['天気予報では雨','で','动作地点／手段'],
    ['毎晩かかってくるの。続く','の','连接名词／所属'],
  ]){
    const checked=auditSentence(card(sentence,term,meaning),'ja')
    assert.ok(checked.errors.length>0,JSON.stringify({sentence,checked}))
  }
})
