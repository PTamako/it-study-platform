import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const app = await readFile(new URL('../src/App.vue', import.meta.url), 'utf8')

test('language cards have distinct all, unlearned, in-progress, and mastered filters', () => {
  assert.match(app, /selectedLanguageMastery = ref<'all' \| 'unlearned' \| 'unmastered' \| 'mastered'>\('all'\)/)
  assert.match(app, /const isLanguageCardUnlearned = \(card: LanguageCard\)/)
  assert.match(app, /review\.review_count === 0/)
  assert.match(app, /未学习 \{\{ unlearnedLanguageCount \}\}/)
  assert.match(app, /学习中 \/ 待复习/)
  assert.match(app, /已掌握 \{\{ languageCards\.filter\(card => completedLanguageCards\.includes\(card\.id\)\)\.length \}\}/)
})

test('cloud review hydration preserves local-only review records during sync', () => {
  assert.match(app, /const cloudReviews = reviewData\.items \|\| \[\]/)
  assert.match(app, /!cloudReviews\.some\(cloud => cloud\.card_id === local\.card_id\)/)
})
