import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const app = await readFile(new URL('../src/App.vue', import.meta.url), 'utf8')
const migration = await readFile(new URL('../migrations/0078_restore_japanese_learning_headwords.sql', import.meta.url), 'utf8')
const seed = await readFile(new URL('../migrations/0003_language_and_dictionary_content.sql', import.meta.url), 'utf8')

test('Japanese language cards show the source-language headword as the large title', () => {
  assert.match(app, /<h3>\{\{ card\.term \}\}<\/h3>/)
  assert.match(app, /<p class="language-meaning">\{\{ card\.meaning_zh \}\}<\/p>/)
  assert.match(app, /const lang = card\.language === 'ja' \? 'ja-JP' : 'en-US'/)
})

test('Japanese learning seed cards restore Japanese headwords instead of Chinese translations', () => {
  const expectedHeadwords = [
    'もう一度お願いします。', 'ちょっと聞いてもいいですか。', '大丈夫です。',
    '確認してから、ご連絡します。', '承知しました。', '念のため確認させてください。',
    '〜かもしれません', '〜ことになっています', '影響範囲を確認します',
    '切り戻し手順を用意します', '再現手順を教えていただけますか',
    '暫定対応を行います', '認識合わせをお願いします', '〜ておきます',
    '〜わけではありません',
  ]
  for (const headword of expectedHeadwords) {
    assert.ok(migration.includes(headword), `missing Japanese headword: ${headword}`)
  }
  assert.match(migration, /SET term = 'もう一度お願いします。'/)
  assert.match(seed, /'ja-daily-01','ja','日常与情景会话','もう一度お願いします。'/)
  assert.match(seed, /'麻烦再说一遍。'/)
})

test('Japanese speech never falls back to a voice from another language', () => {
  assert.match(app, /const voices = availableVoices\.filter\(voice => normalize\(voice\.lang\)\.startsWith\(prefix\)\)/)
  assert.match(app, /normalize\(candidate\.lang\) === normalizedLang/)
  assert.doesNotMatch(app, /\|\| voices\.find\(candidate => \/natural\|enhanced\|premium\|siri\|daniel\|karen\|ava\|alex\|samantha\|kyoko\|otoya\/i\.test\(candidate\.name\)\)/)
})

test('Japanese learning banner copy is Japanese, not Chinese', () => {
  assert.match(app, /studyLanguage === 'ja' \? '実際の場面で使える日本語を身につけよう。'/)
  assert.match(app, /studyLanguage === 'ja' \? '日常会話や職場で使える表現を、読み方・中国語訳・実例とともに学びます。'/)
})
