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
