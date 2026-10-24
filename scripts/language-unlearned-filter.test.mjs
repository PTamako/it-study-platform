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

test('language cards are classified dynamically and paginated for large decks', () => {
  assert.match(app, /const languageCategories = computed\(\(\) =>/)
  assert.match(app, /const languagePageSize = 30/)
  assert.match(app, /const paginatedLanguageCards = computed/)
  assert.match(app, /languagePage\.value = 1/)
  assert.match(app, /v-for="card in paginatedLanguageCards"/)
  assert.match(app, /example_source_url/)
  assert.match(app, /Tatoeba/)
  assert.match(app, /vocabulary_expansion_json/)
  assert.match(app, /grammar_expansion_json/)
  assert.match(app, /parseLanguageExpansion/)
})

test('cloud review hydration preserves local-only review records during sync', () => {
  assert.match(app, /const cloudReviews = reviews\.items \|\| \[\]/)
  assert.match(app, /!cloudReviews\.some\(cloud => cloud\.card_id === local\.card_id\)/)
})
