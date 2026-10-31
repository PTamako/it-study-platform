import test from 'node:test'
import assert from 'node:assert/strict'
import ts from 'typescript'
import { DatabaseSync } from 'node:sqlite'
import { readFile } from 'node:fs/promises'

let workerSource = await readFile(new URL('../worker/index.ts', import.meta.url), 'utf8')
workerSource = workerSource.replace("import { checkWriteRateLimit, handleAuthRequest, requireAuth } from './auth'",
  "const checkWriteRateLimit=async()=>null; const handleAuthRequest=async()=>null; const requireAuth=async()=>null;")
workerSource = workerSource.replace("import { feSeeds, seedUrl } from './fe-question-bank'",
  "const feSeeds=[]; const seedUrl=()=>'';")
const worker = (await import('data:text/javascript;base64,' + Buffer.from(ts.transpile(workerSource, {
  target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext,
})).toString('base64'))).default
const realFetch = globalThis.fetch
globalThis.fetch = async (input, init) => {
  const url = String(input)
  if (url.includes('jisho.org/api/')) return new Response(JSON.stringify({ data: [] }), { status: 200 })
  if (url.includes('dictionaryapi.dev/api/')) return new Response(JSON.stringify([]), { status: 200 })
  // Curated phrase tests must not require unreliable external translations.
  throw new Error('Unexpected network lookup: ' + url)
}
process.on('exit', () => { globalThis.fetch = realFetch })
async function query(text, lang = 'auto', DB) {
  const url = 'https://study.test/api/dictionary?q=' + encodeURIComponent(text) + '&lang=' + lang
  const response = await worker.fetch(new Request(url), { DB })
  return { status: response.status, data: await response.json() }
}
function technicalDb() {
  const sql = new DatabaseSync(':memory:')
  sql.exec("CREATE TABLE vocabulary (term TEXT PRIMARY KEY, language TEXT, reading TEXT, meaning_zh TEXT, meaning_ja TEXT, meaning_en TEXT, example TEXT, source_module TEXT, aliases TEXT)")
  sql.prepare('INSERT INTO vocabulary VALUES (?,?,?,?,?,?,?,?,?)')
    .run('認証','ja','にんしょう','认证；身份验证','本人確認を行うこと','Authentication: checking identity.','本人確認を行う。','security','authentication|认证')
  const DB = { prepare(statement) {
    const build = args => ({
      all: async () => ({ results: sql.prepare(statement).all(...args) }),
      first: async () => sql.prepare(statement).get(...args) || null,
    })
    return { ...build([]), bind: (...args) => build(args) }
  }}
  return { sql, DB }
}

test('Chinese is recognized automatically and returns authentic Japanese and English equivalents', async () => {
  for (const term of ['你好', '学习', '认证', '信息安全']) {
    const { status, data } = await query(term)
    assert.equal(status, 200)
    assert.equal(data.detected_language, 'zh', term)
    assert.equal(data.items[0].language, 'zh', term)
    assert.equal(data.items[0].zh, term)
    assert.ok(data.items[0].englishTerm, term)
    assert.ok(data.items[0].translationJa, term)
  }
})
test('English input returns both Chinese and Japanese, without duplicate or invented definitions', async () => {
  const { data } = await query('hello')
  assert.equal(data.detected_language, 'en')
  assert.equal(data.items.length, 1)
  assert.equal(data.items[0].zh, '你好')
  assert.equal(data.items[0].translationJa, 'こんにちは')
  assert.equal(data.items[0].en, '', 'no provider definition must not be invented')
})
test('Japanese kana and Japanese-only kanji stay Japanese and return Chinese and English', async () => {
  const a = (await query('こんにちは')).data
  assert.equal(a.detected_language, 'ja')
  assert.equal(a.items[0].zh, '你好')
  assert.equal(a.items[0].en, 'Hello')
  const b = (await query('認証')).data
  assert.equal(b.detected_language, 'ja')
  assert.match(b.items[0].zh, /认证/)
  assert.equal(b.items[0].en, 'Authentication')
})
test('manual Chinese/Japanese selection disambiguates Han characters', async () => {
  assert.equal((await query('認証', 'zh')).data.detected_language, 'zh')
  assert.equal((await query('认证', 'ja')).data.detected_language, 'ja')
  assert.equal((await query('こんにちは', 'zh')).data.detected_language, 'zh')
})
test('IT terminology stays offline with Chinese aliases, preserves Japanese headword and never leaks scoring', async () => {
  const { sql, DB } = technicalDb()
  const it = await query('认证','it', DB)
  assert.equal(it.status, 200)
  assert.equal(it.data.items[0].technical,true)
  assert.equal(it.data.items[0].language,'zh')
  assert.equal(it.data.items[0].term,'认证')
  assert.equal(it.data.items[0].japaneseTerm,'認証')
  assert.match(it.data.items[0].en,/Authentication/)
  assert.equal(it.data.items[0].zh,'认证')
  const jp = await query('認証','auto', DB)
  assert.equal(jp.data.items[0].language,'ja')
  assert.match(jp.data.items[0].zh,/认证/)
  sql.close()
})
test('invalid languages, missing queries and too-long requests are rejected', async () => {
  assert.equal((await query('你好','fr')).status, 400)
  assert.equal((await query('','zh')).status, 400)
  assert.equal((await query('a'.repeat(101),'zh')).status,400)
})
test('trilingual UI keeps all pronunciation controls and saved-word translation snapshots', async () => {
  const app = await readFile(new URL('../src/App.vue', import.meta.url),'utf8')
  assert.match(app, /setDictionaryLanguage\('zh'\)/)
  assert.match(app, /speakDictionaryChinese\(entry\)/)
  assert.match(app, /speak\(text, 'zh-CN', entry\.term\)/)
  assert.match(app, /v-if="entry\.zh"/)
  assert.match(app, /dictionaryDetectedLanguage\.value = data\.detected_language/)
  assert.match(app, /中文翻译／释义/)
  assert.match(app, /未检测到中文语音/)
})
