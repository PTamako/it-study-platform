import { inlineChineseDictionary } from './inline-chinese-dictionary.mjs'
import test from 'node:test'
import assert from 'node:assert/strict'
import { DatabaseSync } from 'node:sqlite'
import { readFile, writeFile, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const dir = await mkdtemp(join(tmpdir(), 'vocabulary-worker-'))
const source = (await readFile(new URL('../worker/index.ts', import.meta.url), 'utf8'))
  .replace("import { checkWriteRateLimit, handleAuthRequest, requireAuth } from './auth'", 'const checkWriteRateLimit = async () => null; const handleAuthRequest = async () => null; const requireAuth = async () => null')
  .replace("import { feSeeds, seedUrl } from './fe-question-bank'", "const feSeeds = []; const seedUrl = () => ''")
const workerFile = join(dir, 'worker.mts'); await writeFile(workerFile, inlineChineseDictionary(source))
const worker = (await import(pathToFileURL(workerFile))).default
process.on('exit', () => { void rm(dir, { recursive: true, force: true }) })
function dbAdapter() {
  const db = new DatabaseSync(':memory:')
  db.exec('CREATE TABLE saved_vocabulary_entries_v2 (language TEXT NOT NULL, term TEXT NOT NULL, entry_json TEXT NOT NULL, saved_at TEXT DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY(language,term))')
  return { raw: db, prepare(sql) {
    const prepare = args => ({
      all: async () => ({results: db.prepare(sql).all(...args)}),
      first: async () => db.prepare(sql).get(...args),
      run: async () => db.prepare(sql).run(...args),
    })
    return { ...prepare([]), bind: (...args) => prepare(args) }
  } }
}
async function request(db, body, query='') {
  return worker.fetch(new Request('https://unit.test/api/vocabulary/saved'+query, body ? {method:'POST',headers:{origin:'https://unit.test','content-type':'application/json'},body:JSON.stringify(body)} : undefined), {DB:db})
}
test('old automatic save cannot resurrect deletion; explicit save can restore', async () => {
  const db=dbAdapter()
  assert.equal((await request(db,{term:'a',entry:{term:'a'}})).status,409)
  assert.equal((await request(db,{term:'a',entry:{term:'a'},explicit:true})).status,200)
  assert.equal((await request(db,{term:'a',language:'auto',action:'remove'})).status,200)
  assert.equal((await request(db,{term:'a',entry:{term:'a'}})).status,409)
  assert.deepEqual((await (await request(db)).json()).items,[])
  assert.equal((await (await request(db,undefined,'?sync=1')).json()).items[0].deleted,true)
  assert.equal((await request(db,{term:'a',entry:{term:'a'},explicit:true})).status,200)
  assert.equal((await (await request(db)).json()).items[0].term,'a')
})
test('pages all items without exposing tombstones to legacy GET',async()=>{
 const db=dbAdapter()
 for(let i=0;i<260;i++) db.raw.prepare('INSERT INTO saved_vocabulary_entries_v2 (term,language,entry_json,saved_at) VALUES (?,?,?,CURRENT_TIMESTAMP)').run('term'+String(i).padStart(3,'0'),'ja', JSON.stringify(i%2?{term:'x'}:{_zhixue_deleted_v1:true}))
 const page1=await (await request(db,undefined,'?sync=1')).json(); assert.equal(page1.items.length,200); assert.ok(page1.next)
 const page2=await (await request(db,undefined,'?sync=1&after='+encodeURIComponent(page1.next))).json(); assert.equal(page2.items.length,60); assert.equal(page2.next,null)
 assert.equal((await (await request(db)).json()).items.length,130)
})

test('the same spelling in en and ja is saved and deleted independently',async()=>{
 const db=dbAdapter()
 for(const language of ['en','ja']) assert.equal((await request(db,{term:'gift',language,entry:{term:'gift',language,en:'example'},explicit:true})).status,200)
 let rows=(await (await request(db,undefined,'?sync=1')).json()).items
 assert.deepEqual(rows.map(r=>r.language),['en','ja'])
 assert.equal((await request(db,{term:'gift',language:'ja',action:'remove'})).status,200)
 rows=(await (await request(db,undefined,'?sync=1')).json()).items
 assert.deepEqual(rows.map(r=>r.deleted),[false,true])
 assert.equal((await request(db,{term:'gift',action:'remove'})).status,409)
 db.raw.close()
})
