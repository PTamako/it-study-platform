import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'

const root = new URL('../', import.meta.url)
const app = await readFile(new URL('../src/App.vue', import.meta.url), 'utf8')
const worker = await readFile(new URL('../worker/index.ts', import.meta.url), 'utf8')
const workflow = await readFile(new URL('../.github/workflows/deploy-cloudflare.yml', import.meta.url), 'utf8')
const manifest = JSON.parse(await readFile(new URL('../public/language-cards/manifest.json', import.meta.url), 'utf8'))

test('all 10,000 bilingual licensed cards are served by fingerprinted static assets, not D1', async () => {
  assert.equal(manifest.version, 1)
  for (const language of ['ja', 'en']) {
    const path = manifest[language]
    assert.match(path, new RegExp('^/language-cards/' + language + '[.][0-9a-f]{16}[.]json$'))
    const raw = await readFile(new URL('public' + path, root), 'utf8')
    const fingerprint = createHash('sha256').update(raw.trimEnd()).digest('hex').slice(0, 16)
    assert.equal(path, '/language-cards/' + language + '.' + fingerprint + '.json')
    const deck = JSON.parse(raw)
    assert.equal(deck.items.length, 5000)
    assert.equal(new Set(deck.items.map(card => card.id)).size, 5000)
    for (const card of deck.items) {
      assert.equal(card.language, language)
      assert.equal(card.content_type, 'sentence')
      assert.match(card.source_url, /^https:\/\/tatoeba\.org\//)
      assert.ok(card.term)
      const annotations = JSON.parse(card.highlight_json)
      const words = JSON.parse(card.vocabulary_expansion_json)
      const grammar = JSON.parse(card.grammar_expansion_json)
      assert.ok(annotations.length > 0)
      assert.ok(Array.isArray(words) && Array.isArray(grammar))
    }
  }
})

test('lesson loading and deployment verification no longer query the D1 sentence-card API', () => {
  assert.match(app, /fetchLanguageCorpus<LanguageCard>/)
  assert.match(app, /languageDeckCache\.get\(language\)/)
  assert.doesNotMatch(app, /fetch\(['"]\/api\/language-cards/)
  assert.match(workflow, /Verify published static bilingual sentence corpus without D1 reads/)
  assert.doesNotMatch(workflow, /\/api\/language-cards\?lang=/)
  // The old API endpoint is retained for backward compatibility only.
  assert.match(worker, /url\.pathname === '\/api\/language-cards'/)
})

test('one reviewed card updates locally without fetching the full review table', () => {
  const submit = app.slice(app.indexOf('async function submitLanguageReview'), app.indexOf('const languageProgressHydrating'))
  assert.match(submit, /data\.review/)
  assert.doesNotMatch(submit, /fetch\(['"]\/api\/language-review['"]\)/)
  assert.match(worker, /RETURNING card_id, review_count, correct_streak/)
  assert.match(worker, /review: results\[0\]/)
  const toggle = app.slice(app.indexOf('async function toggleLanguageCard'), app.indexOf('watch\(studyLanguage'))
  assert.doesNotMatch(toggle, /loadCloudDashboard\(\)/)
})
