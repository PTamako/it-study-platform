import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
const app = await readFile(new URL('../src/App.vue', import.meta.url), 'utf8')
const annotations = await readFile(new URL('../src/language-annotations.ts', import.meta.url), 'utf8')
test('language cards validate stored JSON and add contextual grammar and vocabulary fallbacks', () => {
  assert.match(annotations, /export function getLanguageHighlights/)
  assert.match(annotations, /const validated = stored.map/)
  assert.match(annotations, /fallback\(card, boundaries\)/)
  assert.match(annotations, /japaneseBoundaries/)
  assert.match(annotations, /Intl.Segmenter/)
  assert.match(annotations, /term === 'から'/)
})
test('explanations remain synchronized with the actual highlighted text', () => {
  assert.match(annotations, /export function getLanguageExpansions/)
  assert.match(annotations, /return getLanguageHighlights\(card\).filter/)
  assert.match(app, /getLanguageExpansions\(card, type\)/)
  assert.match(app, /getSentenceParts\(card\)/)
  assert.match(app, /languageExpansions\(card, 'vocabulary'\)/)
  assert.match(app, /languageExpansions\(card, 'grammar'\)/)
  assert.match(app, /languageExpansions\(languagePracticeCard, 'vocabulary'\)/)
  assert.match(app, /languageExpansions\(languagePracticeCard, 'grammar'\)/)
})
