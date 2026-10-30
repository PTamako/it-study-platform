import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const migration = await readFile(new URL('../migrations/0082_production_launch_cleanup.sql', import.meta.url), 'utf8')
const reset = await readFile(new URL('./manual-launch-reset.sql', import.meta.url), 'utf8')

test('automatic D1 migrations do not erase production learning history', () => {
  assert.match(migration, /preserve_existing_learning_history/)
  assert.doesNotMatch(migration, /(?:DELETE|DROP|TRUNCATE)\s+(?:FROM\s+|TABLE\s+)?(?:study_attempts|scenario_attempts|exam_history|language_card_progress|language_card_reviews|saved_vocabulary_entries|daily_task_completions|question_review_state)/i)
})
test('legacy reset SQL is manual and outside the migrations directory', () => {
  assert.match(reset, /DELETE FROM study_attempts/)
  assert.match(reset, /DELETE FROM language_card_reviews/)
})
