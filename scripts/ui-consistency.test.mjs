import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const app = await readFile(new URL('../src/App.vue', import.meta.url), 'utf8')
const css = await readFile(new URL('../src/style.css', import.meta.url), 'utf8')

test('navigation, exam filters and language banners use consistent Chinese interface copy', () => {
  assert.match(app, /词典与 IT 术语/)
  assert.match(app, /<strong>筛选题目<\/strong>/)
  assert.match(app, /<option value="">全部<\/option>/)
  assert.match(app, /科目 A（含旧午前题）/)
  assert.match(app, /练习实用日语/)
  assert.match(app, /练习实用英语/)
  assert.match(app, /主动回忆/)
  for (const outdated of ['年度・科目・分野', '>すべて</option>', 'FE 実戦トレーニング', 'ACTIVE RECALL', 'Build confidence one useful phrase']) {
    assert.ok(!app.includes(outdated), `Outdated interface copy: ${outdated}`)
  }
})

test('compact controls preserve the original interactive commands', () => {
  for (const action of [
    'submitPracticeAnswer', 'startMockExam', 'applyPracticeFilter(\'topic\')',
    'speakQuestion(currentQuestion)', 'toggleSpeechPause', 'stopSpeech',
    "submitLanguageReview('remembered')", 'supplementDictionaryWithAi(entry)',
    'toggleSaved(entry.term)', 'syncPendingMockSubmission',
  ]) {
    assert.ok(app.includes(action), `Missing action: ${action}`)
  }
  assert.match(app, /:aria-expanded="languagePracticeRevealed"/)
  assert.match(app, /:aria-pressed="questionSourceFilter === filter.id"/)
  assert.match(app, /:aria-selected="dictionaryView === 'search'"/)
})

test('actions and filters use shared tokens and mobile touch targets', () => {
  assert.match(css, /--ui-control-height:44px/)
  assert.match(css, /--ui-control-radius:11px/)
  assert.match(css, /\.language-review-again,.language-review-remembered/)
  assert.match(css, /\.dictionary-language-picker button/)
  assert.match(css, /\.question-category-filters/)
  assert.match(css, /overflow-x:auto/)
  assert.match(css, /:focus-visible/)
  assert.match(css, /prefers-reduced-motion:reduce/)
})
