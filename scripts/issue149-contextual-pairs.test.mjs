import test from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import ts from 'typescript'

const source = readFileSync(new URL('../src/language-annotations.ts', import.meta.url), 'utf8')
const compiled = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
}).outputText
const client = await import('data:text/javascript;base64,' + Buffer.from(compiled).toString('base64'))
const highlights = (sentence, language, oldHits=[]) =>
  client.getLanguageHighlights({ term: sentence, language, highlight_json: JSON.stringify(oldHits) })

test('issue 149: generator uses whole idioms and refuses misleading literal senses', () => {
  const code = String.raw`
import importlib.util
from pathlib import Path
spec=importlib.util.spec_from_file_location("g",str(Path("scripts/generate_language_sentence_seed.py").resolve()))
g=importlib.util.module_from_spec(spec);spec.loader.exec_module(g)
def hits(s,lang): return g.make_hits(s,lang)
def has(s,lang,term): return [x for x in hits(s,lang) if x["term"].casefold()==term.casefold()]
bad=[
    ("I used to eat like a pig.","en","like"),
    ("There is little chance of my meeting him again.","en","meeting"),
    ("If the teacher said that we should leave.","en","that"),
    ("There is a lot of money.","en","a lot"),
    ("It's hard to believe.","en","a lot"),
    ("彼女は非常に驚いたので、ものが言えなかった。","ja","もの"),
    ("あとから電話します。","ja","と"),
]
for s,lang,t in bad: assert not has(s,lang,t),(s,t,hits(s,lang))
good=[
    ("I have to take a dump.","en","take a dump"),
    ("I need to make a phone call.","en","make a phone call"),
    ("Would you like to leave a message?","en","leave a message"),
    ("You'll have to play it by ear at the interview.","en","play it by ear"),
    ("There is a lot of money.","en","a lot of"),
    ("夢を見るのはただだよ。","ja","夢を見る"),
    ("話すときにネタを使いすぎるのはよくないかな。","ja","よくない"),
    ("今は仕事中なので、あとから電話します。","ja","あとから"),
    ("できるだけ早くお願いします。","ja","できるだけ"),
]
for s,lang,t in good: assert has(s,lang,t),(s,t,hits(s,lang))
# もの is one noun here, not the possessive particle の.
s="時のたつのは早いものだ。"
assert not any(x["term"]=="の" and x["start"]==s.index("もの")+1 for x in hits(s,"ja")),hits(s,"ja")
s="She doesn't need to work."
assert has(s,"en","doesn't need to") and not has(s,"en","need to")
s="Sorry, I have an appointment."
assert not has(s,"en","I have"),hits(s,"en")
`
  const r=spawnSync('python3',['-c',code],{encoding:'utf8',timeout:60000})
  assert.equal(r.status,0,[r.stdout,r.stderr].filter(Boolean).join('\n'))
})

test('issue 149: source matcher rejects wrong word-sense examples without inventing replacements',()=>{
  const code=String.raw`
import sys
from pathlib import Path
sys.path.insert(0,str(Path("scripts").resolve()))
from lexicon_example_matching import compile_headword_patterns,find_exact_headword_matches,choose_source_linked_examples
words={"ja":{"ああ","あと","いくつ","うん","ある","アイスクリーム","学校"},"en":{"abandoned","advanced","work"}}
patterns=compile_headword_patterns(words)
for sentence,term in [
    ("「ああ！」は感嘆詞だ。","ああ"),
    ("あと何時間で着くのよ？","あと"),
    ("今夜は劇場にいくつもりですか。","いくつ"),
    ("うんと暖かくなった。","うん"),
    ("馬は動物である。","ある"),
]:
    assert term not in find_exact_headword_matches(sentence,"ja",patterns["ja"]),(sentence,term)
assert "学校" in find_exact_headword_matches("学校へ行きます。","ja",patterns["ja"])
assert "アイスクリーム" in find_exact_headword_matches("アイスクリームを食べたい。","ja",patterns["ja"])
sentences={"1":("en","Tom abandoned them."),"2":("en","He advanced to colonel."),
           "3":("en","I work here."),"4":("ja","学校へ行きます。")}
translations={"1":"汤姆抛弃了他们。","2":"他升职了。","3":"我在这里工作。","4":"我去学校。"}
matched=choose_source_linked_examples(sentences,translations,words)["languages"]
assert "abandoned" not in matched["en"],matched
assert "advanced" not in matched["en"],matched
assert "work" in matched["en"] and "学校" in matched["ja"],matched
`
  const r=spawnSync('python3',['-c',code],{encoding:'utf8',timeout:60000})
  assert.equal(r.status,0,[r.stdout,r.stderr].filter(Boolean).join('\n'))
})

test('issue 149: browser suppresses legacy misleading highlights while preserving idiom lessons',()=>{
  for(const [language,sentence,fragment] of [
    ['en','I used to eat like a pig.','like'],
    ['en','There is little chance of my meeting him again.','meeting'],
    ['en','The teacher said that we have to go.','that'],
    ['en','I need to make a phone call.','make'],
    ['en','Would you like to leave a message?','leave'],
    ['en','I have to take a dump.','take'],
    ['ja','時のたつのは早いものだ。','の'],
    ['ja','今は仕事中なので、あとから電話します。','と'],
  ]){
    const offset=sentence.indexOf(fragment, language==='ja' && fragment==='の'?sentence.indexOf('もの')+1:0)
    assert.ok(offset>=0,sentence)
    const stale={start:offset,end:offset+fragment.length,term:fragment,
      type:language==='ja'?'grammar':'vocabulary',meaning:'错误释义',explanation:'陈旧高亮'}
    const result=highlights(sentence,language,[stale])
    assert.ok(!result.some(x=>x.start===offset && x.term===fragment),sentence+' => '+JSON.stringify(result))
  }
  for(const [language,sentence,phrase] of [
    ['en','I have to take a dump.','take a dump'],
    ['en','I need to make a phone call.','make a phone call'],
    ['en','Would you like to leave a message?','leave a message'],
    ['ja','話すときにネタを使いすぎるのはよくないかな。','よくない'],
  ]){
    assert.ok(highlights(sentence,language).some(x=>x.term.toLowerCase()===phrase),sentence)
  }
  const old=highlights('Sorry, I need to leave.', 'en', [
    {start:0,end:5,term:'Sorry',type:'vocabulary',meaning:'抱歉的',explanation:'旧词典'}])
  assert.equal(old.find(x=>x.term==='Sorry')?.meaning,'抱歉／不好意思')
})
