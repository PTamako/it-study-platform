import { inlineChineseDictionary } from './inline-chinese-dictionary.mjs'
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import ts from 'typescript'

const workerSrc = readFileSync(new URL('../worker/index.ts', import.meta.url), 'utf8')
  .replace("import { checkWriteRateLimit, handleAuthRequest, requireAuth } from './auth'",
    'const checkWriteRateLimit = async () => null; const handleAuthRequest = async () => null; const requireAuth = async () => null')
  .replace("import { feSeeds, seedUrl } from './fe-question-bank'",
    'const feSeeds = []; const seedUrl = () => ""')
const compiled = ts.transpile(inlineChineseDictionary(workerSrc), {
  target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext,
})
const worker = (await import('data:text/javascript;base64,' + Buffer.from(compiled).toString('base64'))).default
const migration = readFileSync(new URL('../migrations/0152_daily_word_reviews.sql', import.meta.url), 'utf8')

function fixture() {
  const db = new DatabaseSync(':memory:')
  db.exec(migration)
  const env = { DB: { prepare(statement) {
    return { bind(...params) {
      return {
        async all() { return { results: db.prepare(statement).all(...params) } },
        async first() { return db.prepare(statement).get(...params) || null },
        async run() { return db.prepare(statement).run(...params) },
      }
    }, async all() { return { results: db.prepare(statement).all() } } }
  } } }
  async function request(items) {
    const write = items !== undefined
    const response = await worker.fetch(new Request('https://example.test/api/daily-word-reviews', {
      ...(write ? { method: 'POST', headers: { origin: 'https://example.test', 'content-type': 'application/json' }, body: JSON.stringify({ items }) } : {}),
    }), env)
    return { status: response.status, body: await response.json() }
  }
  return { db, request }
}

test('cross-device D1 upload, read and later-day conflict handling work end-to-end', async () => {
  const { db, request } = fixture()
  try {
    assert.deepEqual((await request()).body.items, [])
    const dayOne = { word_key:'ja:報告', streak:1, last_date:'2026-10-01', next_date:'2026-10-02' }
    const first = await request([dayOne])
    assert.equal(first.status,200)
    assert.deepEqual(first.body.items.map(x=>x.word_key),['ja:報告'])
    const sameDay = await request([{ ...dayOne, streak:0, next_date:'2026-10-03' }])
    assert.equal(sameDay.status,200)
    assert.equal(sameDay.body.items[0].streak,1, 'second device cannot regrade the same calendar day')
    const nextDay = await request([{ ...dayOne, streak:2, last_date:'2026-10-02', next_date:'2026-10-05' }])
    assert.equal(nextDay.status,200)
    assert.equal(nextDay.body.items[0].streak,2)
    assert.equal((await request()).body.items.length,1)
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM daily_word_reviews').get().n,1)
  } finally { db.close() }
})

test('invalid, duplicate or future-dated recall does not mutate D1', async () => {
  const { db, request } = fixture()
  try {
    const okay = { word_key:'en:deadline',streak:1,last_date:'2026-10-01',next_date:'2026-10-02' }
    for(const batch of [
      [okay,okay],
      [{...okay,word_key:'invalid'}],
      [{...okay,streak:11}],
      [{...okay,last_date:'2027-01-01',next_date:'2027-01-02'}],
      [{...okay,last_date:'2026-02-30'}],
    ]) assert.equal((await request(batch)).status,400)
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM daily_word_reviews').get().n,0)
  } finally { db.close() }
})
