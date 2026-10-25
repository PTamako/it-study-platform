import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const app = await readFile(new URL('../src/App.vue', import.meta.url), 'utf8')

test('production language learning UI does not ship preview-only sample fixtures', () => {
  assert.doesNotMatch(app, /previewLanguageFixtures|previewDemoMode|demo-ja-daily-001|demo-en-daily-001|source_type: 'preview-demo'/)
})

test('production sentence renderer validates highlight offsets and avoids overlapping ranges', () => {
  assert.match(app, /item\.start >= 0 && item\.end > item\.start && item\.end <= card\.term\.length/)
  assert.match(app, /if \(item\.start < lastEnd\) continue/)
  assert.match(app, /function sentenceParts\(card: LanguageCard \| null\)/)
  assert.match(app, /if \(item\.start < cursor\) continue/)
})
