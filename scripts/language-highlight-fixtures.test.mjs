import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const app = await readFile(new URL('../src/App.vue', import.meta.url), 'utf8')
const fixtureSection = app.split('const previewLanguageFixtures: LanguageCard[] = [')[1]?.split('\nconst languageCards =')[0]
assert.ok(fixtureSection, 'preview language fixtures should be present')

test('preview sentence highlights stay within sentence bounds and do not overlap', () => {
  const starts = [...fixtureSection.matchAll(/id: '(demo-(?:ja|en)-(?:daily|work)-001)'/g)].map(match => ({ id: match[1], index: match.index ?? 0 }))
  assert.equal(starts.length, 4, 'Japanese and English daily/workplace preview fixtures should all exist')

  for (let i = 0; i < starts.length; i += 1) {
    const start = starts[i].index
    const end = i + 1 < starts.length ? starts[i + 1].index : fixtureSection.length
    const card = fixtureSection.slice(start, end)
    const sentence = card.match(/\n    term: '([^']+)'/)?.[1]
    assert.ok(sentence, `${starts[i].id} should have a sentence`)

    const highlightJson = card.match(/highlight_json: JSON.stringify\(\[([\s\S]*?)\]\)/)?.[1]
    assert.ok(highlightJson, `${starts[i].id} should have highlight annotations`)
    const highlights = [...highlightJson.matchAll(/\{ start: (\d+), end: (\d+), type: '(vocabulary|grammar)', term: '([^']+)'/g)]
      .map(match => ({ start: Number(match[1]), end: Number(match[2]), type: match[3], term: match[4] }))
      .sort((a, b) => a.start - b.start || a.end - b.end)

    assert.ok(highlights.length > 0, `${starts[i].id} should have at least one highlight`)
    let previousEnd = 0
    for (const highlight of highlights) {
      assert.ok(highlight.start >= 0 && highlight.end > highlight.start && highlight.end <= sentence.length,
        `${starts[i].id}: invalid span for ${highlight.term}`)
      assert.ok(highlight.start >= previousEnd,
        `${starts[i].id}: overlapping highlight ${highlight.term} would be silently dropped by sentenceParts()`)
      previousEnd = highlight.end
    }
  }
})

test('preview examples use corrected Japanese and English sentence offsets', () => {
  assert.match(fixtureSection, /start: 0, end: 4, type: 'vocabulary', term: 'もう一度'/)
  assert.match(fixtureSection, /start: 6, end: 15, type: 'grammar', term: '〜ていただけますか'/)
  assert.match(fixtureSection, /start: 0, end: 2, type: 'vocabulary', term: '確認'/)
  assert.match(fixtureSection, /start: 2, end: 6, type: 'grammar', term: '〜てから'/)
  assert.match(fixtureSection, /start: 0, end: 13, type: 'grammar', term: 'Could you say'/)
  assert.match(fixtureSection, /start: 19, end: 32, type: 'vocabulary', term: 'one more time'/)
  assert.match(fixtureSection, /start: 29, end: 44, type: 'vocabulary', term: 'get back to you'/)
})
