import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const app = await readFile(new URL('../src/App.vue', import.meta.url), 'utf8')
const worker = await readFile(new URL('../worker/index.ts', import.meta.url), 'utf8')

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


test('active recall prompts from Chinese before revealing the target-language sentence', () => {
  assert.match(app, /先回忆/)
  assert.doesNotMatch(app, /请根据中文提示，用.*说出完整句子/)
  assert.match(app, /v-if="languagePracticeRevealed" class="language-practice-revealed-sentence"/)
  assert.match(app, /v-else class="language-practice-recall-prompt"/)
  assert.match(app, /languagePracticeCard\.meaning_zh \|\| '请先尝试回忆这句话的意思。'/)
  assert.match(app, /显示答案/)
  assert.match(app, /收起答案/)
})


test('language review uses spaced repetition intervals and validates the target card', () => {
  assert.match(worker, /url\.pathname === '\/api\/language-review'/)
  assert.match(worker, /SELECT id FROM language_cards WHERE id = \? AND content_type = 'sentence'/)
  assert.match(worker, /WHEN excluded\.last_result = 'again' THEN '\+10 minutes'/)
  assert.match(worker, /WHEN 1 THEN '\+1 day' WHEN 2 THEN '\+3 days' WHEN 3 THEN '\+7 days' ELSE '\+14 days'/)
  assert.match(worker, /correct_streak = CASE WHEN excluded\.last_result = 'remembered'/)
  assert.match(worker, /review_count = language_card_reviews\.review_count \+ 1/)
})
