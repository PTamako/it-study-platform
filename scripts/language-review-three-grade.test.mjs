import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const source = await readFile(new URL('../worker/index.ts', import.meta.url), 'utf8')
const app = await readFile(new URL('../src/App.vue', import.meta.url), 'utf8')
const migration = await readFile(new URL('../migrations/0131_language_review_three_grade.sql', import.meta.url), 'utf8')

test('three grades are persisted with backward-compatible CHECK and no destructive migration', () => {
  assert.match(migration, /ALTER TABLE language_card_reviews\s+ADD COLUMN last_grade TEXT/)
  assert.doesNotMatch(migration, /DROP TABLE|DELETE FROM|UPDATE language_card_reviews|CREATE TABLE/i)
  assert.match(source, /body\.result === 'hard' \? 'hard'/)
  assert.match(source, /const legacyResult = result === 'hard' \? 'again' : result/)
  assert.match(source, /COALESCE\(last_grade, last_result\) AS last_grade/)
  assert.match(source, /last_grade = excluded\.last_grade/)
  assert.match(source, /\.bind\(cardId, result === 'remembered' \? 1 : 0, modifier, legacyResult, result\)/)
})

test('feedback retains original intervals for old clients and schedules ambiguous feedback at six hours', () => {
  assert.match(source, /result === 'again' \? '\+10 minutes' : result === 'hard' \? '\+6 hours' : '\+1 day'/)
  assert.match(source, /WHEN excluded\.last_grade = 'hard' THEN '\+6 hours'/)
  assert.match(source, /WHEN excluded\.last_result = 'again' THEN '\+10 minutes'/)
  assert.match(source, /WHEN 1 THEN '\+1 day' WHEN 2 THEN '\+3 days' WHEN 3 THEN '\+7 days' ELSE '\+14 days'/)
})

test('three accessible buttons reuse the existing API, with due reviews first and no extra GET', () => {
  assert.match(app, /submitLanguageReview\(result: 'again' \| 'hard' \| 'remembered'\)/)
  for (const grade of ['again','hard','remembered']) assert.match(app,new RegExp("submitLanguageReview\\('"+grade+"'\\)"))
  assert.match(app, /class="language-review-hard"/)
  assert.match(app, /reviewDueByCardId\.value\.get\(id\) \? 0/)
  const reviewAction = app.slice(app.indexOf('async function submitLanguageReview'), app.indexOf('const languageProgressHydrating'))
  assert.doesNotMatch(reviewAction, /fetch\(['"]\/api\/language-review['"]\)/)
  assert.match(reviewAction, /languagePracticeIndex\.value = 0/)
})
