import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
const app = await readFile(new URL('../src/App.vue', import.meta.url), 'utf8')
const annotations = await readFile(new URL('../src/language-annotations.ts', import.meta.url), 'utf8')
test('production language UI never ships preview-only sentence fixtures', () => {
  assert.doesNotMatch(app, /previewLanguageFixtures|previewDemoMode|demo-ja-daily-001|demo-en-daily-001|source_type: 'preview-demo'/)
})
test('renderer preserves exact sentence offsets and non-overlapping spans', () => {
  assert.match(annotations, /hit.term !== card.term.slice\(start, end\)/)
  assert.match(annotations, /hit.start < entry.end && hit.end > entry.start/)
  assert.match(annotations, /if \(item.start < cursor\) continue/)
  assert.match(annotations, /function getSentenceParts/)
  assert.match(app, /getSentenceParts\(card\)/)
})
