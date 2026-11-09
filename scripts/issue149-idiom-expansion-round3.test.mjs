import test from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import ts from 'typescript'

const source=readFileSync(new URL('../src/language-annotations.ts', import.meta.url),'utf8')
const compiled=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText
const client=await import('data:text/javascript;base64,'+Buffer.from(compiled).toString('base64'))
const clientHits=(sentence,hits=[])=>client.getLanguageHighlights({
  language:'en',term:sentence,highlight_json:JSON.stringify(hits)
})

test('source generator handles indirect-object leave-a-message, compound post office, close by and that-complement',()=>{
  const python=String.raw`
import importlib.util
from pathlib import Path
spec=importlib.util.spec_from_file_location('gen',str(Path('scripts/generate_language_sentence_seed.py').resolve()))
gen=importlib.util.module_from_spec(spec)
spec.loader.exec_module(gen)
def hits(s): return gen.make_hits(s,'en')
def has(s,needle): return any(h['term'].casefold()==needle.casefold() for h in hits(s))
s='Would you like to leave him a message?'
assert has(s,'leave him a message'),hits(s)
assert not has(s,'leave'),hits(s)
for person in ('her','me','them','us','you'):
    s='Would you like to leave '+person+' a message?'
    assert has(s,'leave '+person+' a message'),hits(s)
s='There is a post office close by.'
assert has(s,'a post office'),hits(s)
assert not has(s,'a post'),hits(s)
assert has(s,'close by'),hits(s)
assert not has(s,'close'),hits(s)
s='I am very sorry that I have to ask you for help.'
assert not has(s,'that'),hits(s)
s='That meeting is important.'
assert has(s,'That'),hits(s)
`
  const r=spawnSync('python3',['-c',python],{encoding:'utf8',timeout:45000})
  assert.equal(r.status,0,[r.stdout,r.stderr].filter(Boolean).join('\n'))
})

test('browser does not render misleading old phrases and recognizes productive message idiom',()=>{
  const old=[
    ["There is a post office close by.",'a post','完整名词短语','post office'],
    ["There is a post office close by.",'close','关闭／接近','close by'],
    ["Would you like to leave him a message?",'leave','离开／留下','leave him a message'],
    ["I am very sorry that I have to ask you to change the meeting date.",'that','那个／那',''],
  ]
  for(const [sentence,word,meaning,expected] of old){
    const i=sentence.indexOf(word)
    assert.ok(i>=0,sentence)
    const h={start:i,end:i+word.length,term:word,type:'vocabulary',meaning,explanation:'错误旧例'}
    const result=clientHits(sentence,[h])
    assert.ok(!result.some(x=>x.start===i&&x.term.toLowerCase()===word.toLowerCase()),JSON.stringify(result))
    if(expected)assert.ok(result.some(x=>x.term.toLowerCase()===expected.toLowerCase()),sentence+' '+JSON.stringify(result))
  }
  assert.ok(clientHits('We must leave her a message.').some(x=>x.term.toLowerCase()==='leave her a message'))
})
