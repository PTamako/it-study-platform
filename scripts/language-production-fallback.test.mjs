import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const app = await readFile(new URL('../src/App.vue', import.meta.url), 'utf8')

test('language sentence cards have a resilient fallback when production annotations are empty', () => {
  assert.match(app, /function languageHighlights\(card: LanguageCard \| null\)/)
  assert.match(app, /const grammarPresent = highlights\.some\(item => item\.type === 'grammar'\)/)
  assert.match(app, /fallbackGrammarPatterns\.filter\(item => item\.language === card\.language\)/)
  assert.match(app, /if \(!highlights\.some\(item => item\.type === 'vocabulary'\)\)/)
  assert.match(app, /function languageExpansions\(card: LanguageCard \| null, type: 'vocabulary' \| 'grammar'\)/)
  assert.match(app, /const highlights = languageHighlights\(card\)\.filter\(item => item\.type === type\)/)
})

test('sentence UI renders separate vocabulary and grammar explanations through fallback-aware data', () => {
  assert.match(app, /languageExpansions\(card, 'vocabulary'\)/)
  assert.match(app, /languageExpansions\(card, 'grammar'\)/)
  assert.match(app, /languageExpansions\(languagePracticeCard, 'vocabulary'\)/)
  assert.match(app, /languageExpansions\(languagePracticeCard, 'grammar'\)/)
  assert.match(app, /sentenceParts\(card\)/)
  assert.match(app, /sentenceParts\(languagePracticeCard\)/)
})

test('stored annotation ranges are validated and overlap is skipped rather than corrupting sentence text', () => {
  assert.match(app, /item\.start >= 0 && item\.end > item\.start && item\.end <= card\.term\.length/)
  assert.match(app, /if \(item\.start < cursor\) continue/)
  assert.match(app, /card\.term\.slice\(item\.start, item\.end\)/)
})
