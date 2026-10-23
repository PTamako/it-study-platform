import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const app = await readFile(new URL('../src/App.vue', import.meta.url), 'utf8')
const migration = await readFile(new URL('../migrations/0078_restore_japanese_learning_headwords.sql', import.meta.url), 'utf8')

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
  assert.match(migration, /meaning_zh/)
})
