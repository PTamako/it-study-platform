import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { DatabaseSync } from 'node:sqlite'
import ts from 'typescript'

const source = await readFile(new URL('../src/advanced-language-cards-batch2.ts', import.meta.url), 'utf8')
const migration = await readFile(new URL('../migrations/0118_advanced_context_language_cards_batch2.sql', import.meta.url), 'utf8')
const app = await readFile(new URL('../src/App.vue', import.meta.url), 'utf8')
const worker = await readFile(new URL('../worker/index.ts', import.meta.url), 'utf8')
const js = ts.transpile(source, { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext })
const { advancedLanguageCardsBatch2: cards } = await import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'))

test('100 original advanced sentences have bilingual meanings and precise annotated spans', () => {
  assert.equal(cards.length, 100)
  assert.equal(cards.filter(item => item.language === 'ja').length, 50)
  assert.equal(cards.filter(item => item.language === 'en').length, 50)
  const ids = new Set()
  const texts = new Set()
  for (const card of cards) {
    assert.ok(!ids.has(card.id), 'duplicate id ' + card.id)
    ids.add(card.id)
    assert.ok(!texts.has(card.language + card.term), 'duplicate sentence ' + card.id)
    texts.add(card.language + card.term)
    assert.match(card.id, /^(ja|en)-sentence-advanced-(0[2-6]\d|07[0-2])$/)
    assert.ok(card.term.length >= (card.language === 'ja' ? 24 : 65), 'too short: ' + card.id)
    assert.ok(card.meaning_zh.length >= 10, 'missing Chinese meaning: ' + card.id)
    assert.ok(card.explanation.length > 12)
    assert.equal(card.content_type, 'sentence')
    assert.equal(card.source_type, 'generated')
    assert.equal(card.source_url, '', 'original sentences must not claim external attribution')
    const highlights = JSON.parse(card.highlight_json)
    const vocabulary = JSON.parse(card.vocabulary_expansion_json)
    const grammar = JSON.parse(card.grammar_expansion_json)
    assert.equal(highlights.length, 2, 'one grammar and one vocabulary item: ' + card.id)
    assert.equal(vocabulary.length, 1)
    assert.equal(grammar.length, 1)
    for (const hit of highlights) {
      assert.equal([...card.term].slice(hit.start, hit.end).join(''), hit.term,
        'offset mismatch ' + card.id + ': ' + hit.term)
      assert.ok(hit.meaning.length > 1 && hit.explanation.length > 8)
    }
    assert.ok(highlights[0].end <= highlights[1].start, 'overlapping annotations ' + card.id)
    assert.ok(highlights.some(item => item.type === 'grammar'))
    assert.ok(highlights.some(item => item.type === 'vocabulary'))
    assert.equal(vocabulary[0].term, highlights.find(h => h.type === 'vocabulary').term)
    assert.equal(grammar[0].term, highlights.find(h => h.type === 'grammar').term)
    assert.ok(migration.includes("'" + card.id + "'"), 'migration missing ' + card.id)
  }
})

test('additive migration is idempotent and preserves prior study records', () => {
  const sql = new DatabaseSync(':memory:')
  try {
    sql.exec('CREATE TABLE language_cards (' +
      'id TEXT PRIMARY KEY, language TEXT NOT NULL, category TEXT NOT NULL, term TEXT NOT NULL,' +
      'reading TEXT, meaning_zh TEXT NOT NULL, explanation TEXT NOT NULL, example TEXT,' +
      'example_meaning_zh TEXT, example_source_url TEXT, source_type TEXT NOT NULL,' +
      'content_type TEXT NOT NULL, source_url TEXT, highlight_json TEXT,' +
      'vocabulary_expansion_json TEXT, grammar_expansion_json TEXT)')
    sql.exec("INSERT INTO language_cards (id,language,category,term,meaning_zh,explanation,source_type,content_type) VALUES ('ja-sentence-advanced-001','ja','职场语言','旧句子','旧意思','保留','generated','sentence')")
    sql.exec('CREATE TABLE language_card_progress (card_id TEXT PRIMARY KEY, mastered INTEGER NOT NULL)')
    sql.exec("INSERT INTO language_card_progress VALUES ('ja-sentence-advanced-001',1)")
    sql.exec(migration)
    assert.equal(sql.prepare('SELECT COUNT(*) AS n FROM language_cards').get().n, 101)
    assert.equal(sql.prepare("SELECT COUNT(*) AS n FROM language_cards WHERE id LIKE 'ja-sentence-advanced-%'").get().n,51)
    assert.equal(sql.prepare("SELECT COUNT(*) AS n FROM language_cards WHERE id LIKE 'en-sentence-advanced-%'").get().n,50)
    assert.equal(sql.prepare("SELECT term FROM language_cards WHERE id='ja-sentence-advanced-001'").get().term,'旧句子')
    sql.exec(migration)
    assert.equal(sql.prepare('SELECT COUNT(*) AS n FROM language_cards').get().n,101)
    assert.equal(sql.prepare("SELECT mastered FROM language_card_progress WHERE card_id='ja-sentence-advanced-001'").get().mastered,1)
  } finally { sql.close() }
})

test('new cards are bundled without extra D1 lesson reads or modifying licensed static corpus', () => {
  assert.match(app,/import \{ advancedLanguageCardsBatch2 \} from '\.\/advanced-language-cards-batch2'/)
  assert.match(app,/advancedLanguageCardsBatch2\.filter\(card => card\.language === language\)/)
  assert.match(app,/fetchLanguageCorpus<LanguageCard>/)
  assert.match(worker,/SELECT 10144 AS total/)
})
