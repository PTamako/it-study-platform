import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { DatabaseSync } from 'node:sqlite'
import ts from 'typescript'
import { inlineChineseDictionary } from './inline-chinese-dictionary.mjs'

const source = await readFile(new URL('../worker/index.ts', import.meta.url), 'utf8')
const frontend = await readFile(new URL('../src/App.vue', import.meta.url), 'utf8')
const advancedFile = await readFile(new URL('../src/advanced-language-cards.ts', import.meta.url), 'utf8')
const advancedSql = await readFile(new URL('../migrations/0116_advanced_context_language_cards.sql', import.meta.url), 'utf8')
const indexSql = await readFile(new URL('../migrations/0115_index_local_learning_dictionary.sql', import.meta.url), 'utf8')

function memoryDb() {
  const sql = new DatabaseSync(':memory:')
  sql.exec("CREATE TABLE vocabulary(term TEXT PRIMARY KEY, language TEXT, reading TEXT, meaning_zh TEXT, meaning_ja TEXT, meaning_en TEXT, example TEXT, source_module TEXT, aliases TEXT)")
  sql.exec("CREATE TABLE language_cards(id TEXT PRIMARY KEY, language TEXT, category TEXT, term TEXT, reading TEXT, meaning_zh TEXT, explanation TEXT, example TEXT, example_meaning_zh TEXT, example_source_url TEXT, source_type TEXT, content_type TEXT, source_url TEXT, highlight_json TEXT, vocabulary_expansion_json TEXT, grammar_expansion_json TEXT)")
  sql.exec(indexSql)
  const DB = {
    prepare(statement) {
      const wrap = (args) => ({
        all: async () => ({ results: sql.prepare(statement).all(...args) }),
        first: async () => sql.prepare(statement).get(...args) || null,
        run: async () => sql.prepare(statement).run(...args),
      })
      return { ...wrap([]), bind: (...args) => wrap(args) }
    },
  }
  return { sql, DB }
}

let runnable = source
  .replace("import { checkWriteRateLimit, handleAuthRequest, requireAuth } from './auth'",
    "const checkWriteRateLimit = async () => null; const handleAuthRequest = async () => null; const requireAuth = async () => null;")
  .replace("import { feSeeds, seedUrl } from './fe-question-bank'",
    "const feSeeds = []; const seedUrl = () => '';")
runnable = inlineChineseDictionary(runnable)
const worker = (await import('data:text/javascript;base64,' + Buffer.from(ts.transpile(runnable, {
  target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext,
})).toString('base64'))).default

const realFetch = globalThis.fetch
globalThis.fetch = async () => { throw new Error('Network disabled for local-first regression') }
process.on('exit', () => { globalThis.fetch = realFetch })

async function query(word, lang, DB) {
  const url = 'https://study.test/api/dictionary?q=' + encodeURIComponent(word) + '&lang=' + lang
  const response = await worker.fetch(new Request(url), { DB })
  return { status: response.status, body: await response.json() }
}

test('exact local ECDICT word uses indexed D1 row and preserves POS, definitions and honest phonetic notation', async () => {
  const { sql, DB } = memoryDb()
  sql.prepare("INSERT INTO language_cards (id,language,category,term,reading,meaning_zh,explanation,example,source_type,content_type) VALUES (?,?,?,?,?,?,?,?,?,?)")
    .run('en-ecdict-1','en','英语进阶词汇','cloud','klaud','n. 云\\nvt. 遮蔽','n. a visible mass of water\\nv. make less clear','','licensed','word')
  const result = await query('cloud', 'en', DB)
  assert.equal(result.status, 200)
  assert.equal(result.body.items.length, 1)
  const item = result.body.items[0]
  assert.equal(item.term, 'cloud')
  assert.match(item.zh, /云/)
  assert.equal(item.transcription, 'klaud')
  assert.equal(item.phonetic, undefined, 'ECDICT is not guaranteed to provide IPA')
  assert.deepEqual(item.partsOfSpeech, ['noun', 'verb'])
  assert.ok(item.senses.some(sense => sense.definitions.some(x => /visible mass/.test(x))))
  assert.match(item.source, /ECDICT/)
  assert.doesNotMatch(item.source, /AI/)
  sql.close()
})

test('existing Japanese learning words return original example and Chinese translation without invented POS', async () => {
  const { sql, DB } = memoryDb()
  sql.prepare("INSERT INTO language_cards (id,language,category,term,reading,meaning_zh,explanation,example,example_meaning_zh,source_type,content_type) VALUES (?,?,?,?,?,?,?,?,?,?,?)")
    .run('ja-grammar-004','ja','词汇与语法','〜ておきます','〜ておきます','事先准备','表示预先采取行动','資料を確認しておきます。','我会先确认资料。','generated','word')
  const result = await query('〜ておきます','ja', DB)
  assert.equal(result.status,200)
  const item = result.body.items[0]
  assert.equal(item.zh,'事先准备')
  assert.equal(item.exampleTranslationZh,'我会先确认资料。')
  assert.match(item.usageNote,/预先/)
  assert.deepEqual(item.partsOfSpeech,[])
  sql.close()
})

test('IT lookup remains independent and never switches to general learner word cards', async () => {
  const { sql, DB } = memoryDb()
  sql.prepare('INSERT INTO vocabulary VALUES (?,?,?,?,?,?,?,?,?)').run(
    '認証','ja','にんしょう','认证','本人確認','Authentication','認証を行う。','security','authentication|认证')
  const result = await query('認証','it',DB)
  assert.equal(result.status,200)
  assert.equal(result.body.items[0].technical,true)
  assert.match(result.body.items[0].source,/IT/)
  sql.close()
})

test('44 original advanced cards are well annotated and additive to progress', async () => {
  const js = ts.transpile(advancedFile, { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext })
  const { advancedLanguageCards: cards } = await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'))
  assert.equal(cards.length,44)
  assert.equal(new Set(cards.map(card=>card.id)).size,44)
  assert.equal(cards.filter(card=>card.language==='ja').length,22)
  assert.equal(cards.filter(card=>card.language==='en').length,22)
  for (const card of cards) {
    assert.ok(advancedSql.includes("'"+card.id+"'"), card.id)
    assert.ok(card.meaning_zh.length >= 8)
    assert.equal(card.source_type, 'generated')
    assert.equal(card.source_url, '')
    assert.ok(card.term.length >= (card.language === 'ja' ? 24 : 65), card.id)
    const hits = JSON.parse(card.highlight_json)
    for (const hit of hits) assert.equal(card.term.slice(hit.start,hit.end),hit.term,card.id)
    assert.ok(hits.some(hit=>hit.type==='grammar'))
    assert.ok(hits.some(hit=>hit.type==='vocabulary'))
  }
  const { sql } = memoryDb()
  sql.exec(advancedSql)
  assert.equal(sql.prepare("SELECT COUNT(*) n FROM language_cards WHERE content_type='sentence'").get().n,44)
  sql.exec("CREATE TABLE language_card_progress(card_id TEXT PRIMARY KEY,mastered INTEGER)")
  sql.exec("INSERT INTO language_card_progress VALUES ('ja-sentence-advanced-001',1)")
  sql.exec(advancedSql)
  assert.equal(sql.prepare('SELECT COUNT(*) n FROM language_card_progress').get().n,1)
  assert.equal(sql.prepare('SELECT COUNT(*) n FROM language_cards').get().n,44)
  sql.close()
})

test('course default avoids beginner one-liners, while all cards and legacy 5k static corpus remain accessible', () => {
  assert.match(frontend,/selectedSentenceLength = ref<.*>\('practice'\)/)
  assert.match(frontend,/matchesSentenceLength\(card\)/)
  assert.match(frontend,/if \(filter === 'all'\)/)
  assert.match(frontend,/languageLengthCounts\[option\.id\]/)
  assert.match(frontend,/advancedLanguageCards\.filter\(card => card\.language === language\)/)
  assert.match(frontend,/fetchLanguageCorpus<LanguageCard>/)
  assert.match(source,/SELECT 10144 AS total/)
  assert.match(frontend,/词库读音标记/)
  assert.match(frontend,/entry\.exampleTranslationZh/)
})
