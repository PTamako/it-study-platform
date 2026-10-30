import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
const sql = await readFile(new URL('../migrations/0089_sg_2019_autumn_canonical.sql', import.meta.url), 'utf8')
const app = await readFile(new URL('../src/App.vue', import.meta.url), 'utf8')
test('official SG identifiers are updated in place without destroying personal attempt history', () => {
  for (let n=25;n<=30;n++) assert.match(sql, new RegExp('sg-official-2019f-am-'+n))
  assert.match(sql, /ON CONFLICT\(id\) DO UPDATE SET/)
  assert.doesNotMatch(sql, /DELETE FROM (?:questions|study_attempts|question_review_state)/i)
})
test('each exercise item restarts its own elapsed time', () => {
  assert.match(app, /quizIndex\.value \+= 1\s+quizStartedAt\.value = Date\.now\(\)/)
})

test('official IPA 2019 autumn answer key matches all six restored SG questions', () => {
  // https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000dict-att/2019r01a_sg_am_ans.pdf
  const expected = {25:'a',26:'d',27:'b',28:'d',29:'d',30:'a'}
  for (const [n, answer] of Object.entries(expected)) {
    const entry = sql.split("('sg-official-2019f-am-" + n + "'")[1]
    assert.ok(entry, 'missing question ' + n)
    assert.equal(entry.match(/,'"(a|b|c|d)"',/)?.[1], answer, 'IPA answer differs for ' + n)
  }
})
