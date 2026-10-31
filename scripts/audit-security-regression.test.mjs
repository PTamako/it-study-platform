import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import ts from 'typescript'
import { webcrypto } from 'node:crypto'
if (!globalThis.crypto) globalThis.crypto = webcrypto
let source = readFileSync(new URL('../worker/index.ts', import.meta.url), 'utf8')
source = source.replace("import { checkWriteRateLimit, handleAuthRequest, requireAuth } from './auth'", "const checkWriteRateLimit=async()=>null; const handleAuthRequest=async()=>null; const requireAuth=async()=>null;")
source = source.replace("import { feSeeds, seedUrl } from './fe-question-bank'", "const feSeeds=[]; const seedUrl=()=>'';")
const worker = (await import('data:text/javascript;base64,' + Buffer.from(ts.transpile(source, {target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext})).toString('base64'))).default
const migration = readFileSync(new URL('../migrations/0114_public_dictionary_rate_limits.sql', import.meta.url),'utf8')
const sqlite = new DatabaseSync(':memory:')
sqlite.exec(migration)
const DB = { prepare(query) {
  const statement=args=>({
    first:async()=>sqlite.prepare(query).get(...args)||null,
    run:async()=>sqlite.prepare(query).run(...args),
    all:async()=>({results:sqlite.prepare(query).all(...args)}),
  })
  return { ...statement([]), bind:(...args)=>statement(args) }
} }
const base='https://study.test'
test('public dictionary rate limit is atomic and returns retry-after; other API routes are unaffected',async()=>{
  const env={DB,AUTH_SESSION_SECRET:'test-secret-for-dictionary-rate-limiter-12345'}
  const originalFetch=globalThis.fetch
  globalThis.fetch=async()=>new Response(JSON.stringify([]),{status:200})
  try {
    for(let i=0;i<30;i++){
      const resp=await worker.fetch(new Request(base+'/api/dictionary?q=hello&lang=en',{headers:{'cf-connecting-ip':'192.0.2.1'}}),env)
      assert.equal(resp.status,200)
    }
    const denied=await worker.fetch(new Request(base+'/api/dictionary?q=hello&lang=en',{headers:{'cf-connecting-ip':'192.0.2.1'}}),env)
    assert.equal(denied.status,429);assert.ok(Number(denied.headers.get('retry-after'))>0)
    assert.equal((await worker.fetch(new Request(base+'/api/dictionary?q=hello&lang=en',{headers:{'cf-connecting-ip':'192.0.2.2'}}),env)).status,200)
    assert.equal((await worker.fetch(new Request(base+'/api/health'),env)).status,200)
    const rows=sqlite.prepare('SELECT bucket_key FROM public_dictionary_rate_limits').all()
    assert.equal(rows.length,2)
    assert.ok(rows.every(row=>/^[a-f0-9]{64}$/.test(row.bucket_key)))
  } finally {globalThis.fetch=originalFetch}
})
test('the exam history delete endpoint requires server-side confirmation',async()=>{
  const env={DB:{prepare:()=>({run:async()=>({meta:{changes:2}})})}}
  const send=body=>worker.fetch(new Request(base+'/api/exam-history',{method:'DELETE',headers:{origin:base,'content-type':'application/json'},body}),env)
  assert.equal((await send('{}')).status,400)
  assert.equal((await send(JSON.stringify({confirmation:'取消'}))).status,400)
  assert.equal((await send(JSON.stringify({confirmation:'清除'}))).status,200)
})
