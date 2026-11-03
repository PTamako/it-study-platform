import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { DatabaseSync } from 'node:sqlite'
import ts from 'typescript'

const read = (path) => readFile(new URL('../' + path, import.meta.url), 'utf8')
const batchSource = await read('src/advanced-language-cards-batch2.ts')
const originalSource = await read('src/advanced-language-cards.ts')
const batchSql = await read('migrations/0118_advanced_context_language_cards_batch2.sql')
const originalSql = await read('migrations/0116_advanced_context_language_cards.sql')
const app = await read('src/App.vue')
const worker = await read('worker/index.ts')

async function loadCards(source, exportName) {
  const js = ts.transpile(source, { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext })
  return (await import('data:text/javascript;base64,' + Buffer.from(js).toString('base64')))[exportName]
}

const batch = await loadCards(batchSource, 'advancedLanguageCardsBatch2')
const existing = await loadCards(originalSource, 'advancedLanguageCards')

test('new bilingual advanced cards are complete, unique, substantial, and distinct from previous lessons', () => {
  assert.equal(existing.length, 44)
  assert.equal(batch.length, 100)
  const terms = new Set(existing.map(c => c.language + ':' + c.term.normalize('NFKC')))
  const ids = new Set(existing.map(c => c.id))
  for (const lang of ['ja', 'en']) {
    const group = batch.filter(c => c.language === lang)
    assert.equal(group.length, 50)
    const expected = Array.from({ length: 50 }, (_, i) => lang + '-sentence-advanced-' + String(i + 23).padStart(3, '0'))
    assert.deepEqual(group.map(c => c.id), expected)
    for (const card of group) {
      assert.equal(card.source_type, 'generated', card.id)
      assert.equal(card.content_type, 'sentence', card.id)
      assert.equal(card.source_url, '', card.id)
      assert.equal(card.example_source_url, '', card.id)
      assert.ok(['职场语言', '日常句子'].includes(card.category), card.id)
      assert.ok(card.term.length >= (lang === 'ja' ? 24 : 65), card.id + ' short or beginner phrase')
      assert.ok(card.meaning_zh.length >= 15 && !card.meaning_zh.includes('확보'), card.id)
      assert.ok(!ids.has(card.id), card.id + ' old progress ID conflict')
      ids.add(card.id)
      const key = card.language + ':' + card.term.normalize('NFKC')
      assert.ok(!terms.has(key), card.id + ' duplicate lesson')
      terms.add(key)
      assert.ok(batchSql.includes("'" + card.id + "'"), card.id + ' missing from D1')
      const hits = JSON.parse(card.highlight_json)
      assert.equal(hits.length, 2, card.id)
      assert.deepEqual(hits.map(h => h.type).sort(), ['grammar', 'vocabulary'])
      assert.ok(hits[0].end <= hits[1].start, card.id + ' overlapping annotations')
      for (const hit of hits) {
        assert.equal(card.term.slice(hit.start, hit.end), hit.term, card.id + ' incorrect highlight')
        assert.ok(hit.meaning.length >= 2, card.id + ' missing meaning')
        assert.ok(hit.explanation.length >= 12, card.id + ' shallow explanation')
        const expansions = JSON.parse(hit.type === 'grammar' ? card.grammar_expansion_json : card.vocabulary_expansion_json)
        assert.ok(expansions.some(e => e.term === hit.term && e.meaning === hit.meaning && e.explanation === hit.explanation), card.id)
      }
    }
  }
  assert.equal(ids.size, 144)
})

test('idempotent additive migration preserves existing 44 card IDs and personal review progress', () => {
  const db = new DatabaseSync(':memory:')
  try {
    db.exec('CREATE TABLE language_cards(id TEXT PRIMARY KEY,language TEXT,category TEXT,term TEXT,reading TEXT,meaning_zh TEXT,explanation TEXT,example TEXT,example_meaning_zh TEXT,example_source_url TEXT,source_type TEXT,content_type TEXT,source_url TEXT,highlight_json TEXT,vocabulary_expansion_json TEXT,grammar_expansion_json TEXT)')
    db.exec('CREATE TABLE language_card_progress(card_id TEXT PRIMARY KEY,mastered INTEGER)')
    db.exec(originalSql)
    db.exec("INSERT INTO language_card_progress VALUES('ja-sentence-advanced-001',1)")
    db.exec(batchSql)
    assert.equal(db.prepare("SELECT COUNT(*) AS n FROM language_cards").get().n,144)
    assert.equal(db.prepare("SELECT COUNT(*) AS n FROM language_cards WHERE id LIKE 'ja-sentence-advanced-%'").get().n,72)
    assert.equal(db.prepare("SELECT COUNT(*) AS n FROM language_cards WHERE id LIKE 'en-sentence-advanced-%'").get().n,72)
    assert.equal(db.prepare("SELECT mastered FROM language_card_progress WHERE card_id='ja-sentence-advanced-001'").get().mastered,1)
    const old = db.prepare("SELECT term FROM language_cards WHERE id='ja-sentence-advanced-001'").get().term
    db.exec(batchSql)
    assert.equal(db.prepare("SELECT COUNT(*) AS n FROM language_cards").get().n,144)
    assert.equal(db.prepare("SELECT term FROM language_cards WHERE id='ja-sentence-advanced-001'").get().term,old)
    assert.equal(db.prepare("SELECT COUNT(*) AS n FROM language_card_progress").get().n,1)
  } finally {
    db.close()
  }
})

test('advanced content is prebundled, not loaded by per-card D1 queries', () => {
  assert.match(app, /import \{ advancedLanguageCardsBatch2 \} from '\.\/advanced-language-cards-batch2'/)
  assert.match(app, /advancedLanguageCardsBatch2\.filter\(card => card\.language === language\)/)
  assert.match(app, /fetchLanguageCorpus<LanguageCard>\(language, controller\.signal\)/)
  assert.match(app, /const lessons: LanguageCard\[\] = \[/)
  assert.match(worker, /SELECT 10144 AS total/)
  assert.doesNotMatch(batchSource, /fetch\(|D1Database|\/api\/language-cards/)
})
