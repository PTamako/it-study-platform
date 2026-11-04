import test from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { readFile } from 'node:fs/promises'

test('source-linked examples require exact headwords, real direct Chinese translation, and cite original Tatoeba URLs', () => {
  const code = String.raw`
import sys
from pathlib import Path
sys.path.insert(0,str(Path("scripts").resolve()))
from lexicon_example_matching import (
    choose_source_linked_examples, compile_headword_patterns,
    find_exact_headword_matches, is_exact_japanese_form
)
words={"ja":{"学校","いつ","仕事","生活"},"en":{"work","run","used","change"}}
patterns=compile_headword_patterns(words)
assert "いつ" not in find_exact_headword_matches("そいつは来た", "ja", patterns["ja"])
assert "いつ" in find_exact_headword_matches("いつ来ますか？", "ja", patterns["ja"])
assert "学校" not in find_exact_headword_matches("大学校へ行く", "ja", patterns["ja"])
assert "学校" in find_exact_headword_matches("学校へ行く", "ja", patterns["ja"])
assert "run" not in find_exact_headword_matches("running", "en", patterns["en"])
assert "run" in find_exact_headword_matches("Do you run?", "en", patterns["en"])
assert "work" not in find_exact_headword_matches("workplace", "en", patterns["en"])
# Real false matches from the published lexicon's human-review sample.
kana_terms={"ja":{"アウト","アイデア","アルコール","カー","いい","ああ","あと","あさって","いつ"}}
kana_pat=compile_headword_patterns(kana_terms)["ja"]
for sentence, bad in [
    ("ログアウト後に再度ログインする。","アウト"),
    ("ナイスアイデア！","アイデア"),
    ("ノンアルコールビール","アルコール"),
    ("サッカー観る","カー"),
    ("トムは格好いい。","いい"),
    ("「ああ」は感嘆詞だ。","ああ"),
    ("あと10分寝させて。","あと"),
    ("そいつは来た","いつ"),
]:
    assert bad not in find_exact_headword_matches(sentence,"ja",kana_pat),(sentence,bad)
for sentence, good in [
    ("これはいい。","いい"),
    ("いつ来ますか？","いつ"),
    ("あさって来てください。","あさって"),
    ("アイデアがいい。","アイデア"),
]:
    assert good in find_exact_headword_matches(sentence,"ja",kana_pat),(sentence,good)
sentences={
    "10":("ja","学校へ行く。"),"11":("ja","学校へ電車で行きます。"),
    "12":("en","I work there."),"13":("en","This is a workplace."),
    "14":("en","I run."),"99":("ja","学校です。")}
translations={"10":"去学校。","11":"我坐电车去学校。","12":"我在那里工作。",
              "13":"这是一个职场。","14":"我跑步。"}
result=choose_source_linked_examples(sentences,translations,words)
assert result["matched"]=={"ja":1,"en":2},result["matched"]
assert result["languages"]["ja"]["学校"]["example_source_url"].endswith("/11")
assert result["languages"]["ja"]["学校"]["example_meaning_zh"]=="我坐电车去学校。"
assert result["languages"]["en"]["work"]["example"]=="I work there."
assert result["languages"]["en"]["run"]["example"]=="I run."
assert "used" not in result["languages"]["en"]
assert result["languages"]["en"]["work"]["example_review_status"]=="source-linked-unreviewed-sense"
assert "99" not in str(result)
`
  const run = spawnSync('python3', ['-c', code], {encoding:'utf8',timeout:45000})
  assert.equal(run.status,0,[run.stdout,run.stderr].filter(Boolean).join('\n'))
})

test('enrichment stays additive, source-attributed, and cannot invent phonetics or use production D1', async () => {
  const builder=await readFile(new URL('./build_static_learner_dictionary.py',import.meta.url),'utf8')
  const generator=await readFile(new URL('./generate_language_sentence_seed.py',import.meta.url),'utf8')
  const matcher=await readFile(new URL('./lexicon_example_matching.py',import.meta.url),'utf8')
  assert.match(generator,/write_source_linked_examples\(sentences, translations\)/)
  assert.match(builder,/source_examples = read_attested_examples\(\)/)
  assert.match(builder,/if word\["example"\] and word\["example_meaning_zh"\]:/)
  assert.match(builder,/example_source_url/)
  assert.match(builder,/example_review_status/)
  assert.match(matcher,/source-linked-unreviewed-sense/)
  assert.doesNotMatch(matcher+/\n/+builder,/cloudflare\.request|wrangler d1|AI\.run|fetch\(/)
})
