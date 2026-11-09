import test from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'

test('Issue #149: Japanese proper names and fixed phrases must not be promoted as unrelated dictionary meanings', ()=>{
  const code=String.raw`
import sys
from pathlib import Path
sys.path.insert(0, str(Path("scripts").resolve()))
from lexicon_example_matching import compile_headword_patterns, find_exact_headword_matches, choose_source_linked_examples

headwords={"ja":{"しまい","ピン","トランプ","ビル","マイク","ベル","学校"},
           "en":{"abandoned","advanced","confused","excited","fixed","mixed","work"}}
patterns=compile_headword_patterns(headwords)
bad=[
    ("君が同意しようとしまいと、ぼくはやる。","しまい"),
    ("この顔にピンときたら１１０番！","ピン"),
    ("トランプは今７０代です。","トランプ"),
    ("ビルは野球選手だ。","ビル"),
    ("マイクは笑った。","マイク"),
    ("何がベルによって発明されたのですか。","ベル"),
]
for sentence,term in bad:
    hits=find_exact_headword_matches(sentence,"ja",patterns["ja"])
    assert term not in hits,(sentence,term,hits)
good=[
    ("ピンを刺す。","ピン"),
    ("トランプをする。","トランプ"),
    ("ビルは高い。","ビル"),
    ("マイクで話す。","マイク"),
    ("ベルが鳴った。","ベル"),
    ("学校へ行く。","学校"),
]
for sentence,term in good:
    hits=find_exact_headword_matches(sentence,"ja",patterns["ja"])
    assert term in hits,(sentence,term,hits)

sentences={
  "1":("en","He confused us."), "2":("en","I excited her."),
  "3":("en","He fixed the net."), "4":("en","I mixed them up again!"),
  "5":("en","Tom abandoned them."),"6":("en","He advanced to colonel."),
  "7":("en","She was confused."),"8":("en","This is a fixed price."),
  "9":("en","I work here."), "10":("ja","トランプは今７０代です。"),
  "11":("ja","トランプをする。"),"12":("ja","学校へ行く。"),
}
translations={
  "1":"他把我们搞糊涂了。","2":"我使她兴奋。","3":"他修好了网。","4":"我又把它们搞乱了。",
  "5":"汤姆抛弃了他们。","6":"他晋升为上校。","7":"她感到困惑。","8":"这是固定价格。",
  "9":"我在这里工作。","10":"特朗普现在七十多岁。","11":"玩扑克牌。","12":"去学校。",
}
result=choose_source_linked_examples(sentences,translations,headwords)["languages"]
assert "confused" in result["en"] and result["en"]["confused"]["example"]=="She was confused.",result
assert "fixed" in result["en"] and result["en"]["fixed"]["example"]=="This is a fixed price.",result
for term in ("excited","mixed","abandoned","advanced"):
    assert term not in result["en"],(term,result["en"])
assert result["en"]["work"]["example"]=="I work here."
assert result["ja"]["トランプ"]["example"]=="トランプをする。",result
assert result["ja"]["学校"]["example"]=="学校へ行く。"
`
  const run=spawnSync('python3',['-c',code],{encoding:'utf8',timeout:45000})
  assert.equal(run.status,0,[run.stdout,run.stderr].filter(Boolean).join('\n'))
})
