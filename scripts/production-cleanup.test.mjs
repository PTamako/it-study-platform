import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const migration = await readFile(new URL('../migrations/0082_production_launch_cleanup.sql', import.meta.url), 'utf8')

test('production cleanup clears personal progress and history without removing learning content', () => {
  for (const table of [
    'study_attempts',
    'scenario_attempts',
    'exam_history',
    'language_card_progress',
    'language_card_reviews',
    'saved_vocabulary_entries',
    'daily_task_completions',
    'question_review_state',
  ]) {
    assert.match(migration, new RegExp('DELETE FROM ' + table + '\\b'))
  }
  assert.match(migration, /source_reference = '平台自编练习题 v1'/)
  assert.match(migration, /DROP TABLE IF EXISTS vocabulary_relations/)
  assert.match(migration, /DROP TABLE IF EXISTS study_plans/)
  assert.match(migration, /DROP TABLE IF EXISTS daily_study_logs/)
  assert.match(migration, /DROP TABLE IF EXISTS exam_sessions/)
  assert.match(migration, /DROP TABLE IF EXISTS study_preferences/)
  assert.doesNotMatch(migration, /DELETE FROM (questions|language_cards|practical_scenarios|vocabulary);/)
})
