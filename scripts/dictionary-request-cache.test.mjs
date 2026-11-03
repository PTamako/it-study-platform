import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import ts from 'typescript'

const src = await readFile(new URL('../src/dictionary-request-cache.ts', import.meta.url), 'utf8')
const js = ts.transpileModule(src, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText
const { DictionaryRequestCache } = await import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'))

test('repeated simultaneous dictionary queries share one provider request', async () => {
  const cache = new DictionaryRequestCache()
  let calls = 0
  let finish
  const load = () => { calls++; return new Promise(resolve => { finish = resolve }) }
  const a = cache.lookup('en:check', load)
  const b = cache.lookup('en:check', load)
  assert.equal(a, b)
  await Promise.resolve()
  assert.equal(calls, 1)
  finish({ items: ['check'] })
  assert.deepEqual(await a, { items: ['check'] })
  assert.deepEqual(await cache.lookup('en:check', load), { items: ['check'] })
  assert.equal(calls, 1)
})

test('cache expires, is bounded, and does not memoize no-result or provider errors', async () => {
  let now = 1000
  const cache = new DictionaryRequestCache(100, 2, () => now)
  let calls = 0
  const load = async () => { calls++; return { items: [calls] } }
  await cache.lookup('a', load)
  await cache.lookup('b', load)
  await cache.lookup('a', load)
  await cache.lookup('c', load)
  await cache.lookup('b', load)
  assert.equal(calls, 4, 'least recently used key should be evicted')
  now += 101
  await cache.lookup('a', load)
  assert.equal(calls, 5)
  await cache.lookup('empty', async () => { calls++; return { items: [] } }, v => v.items.length > 0)
  await cache.lookup('empty', async () => { calls++; return { items: [] } }, v => v.items.length > 0)
  assert.equal(calls, 7)
  await assert.rejects(cache.lookup('error', async () => { throw new Error('offline') }), /offline/)
  assert.deepEqual(await cache.lookup('error', async () => ({ items: ['recovered'] })), { items: ['recovered'] })
})

test('canceled lookup cannot repopulate cache or supersede a newer request', async () => {
  const cache = new DictionaryRequestCache()
  let finishOld
  const old = cache.lookup('ja:例', () => new Promise(resolve => { finishOld = resolve }))
  await Promise.resolve()
  cache.forgetPending()
  const fresh = cache.lookup('ja:例', async () => ({ items: ['new'] }))
  finishOld({ items: ['old'] })
  assert.deepEqual(await fresh, { items: ['new'] })
  assert.deepEqual(await old, { items: ['old'] })
  assert.deepEqual(await cache.lookup('ja:例', async () => { throw new Error('unexpected duplicate') }), { items: ['new'] })
  cache.clear()
  assert.deepEqual(await cache.lookup('ja:例', async () => ({ items: ['session changed'] })), { items: ['session changed'] })
})

test('dictionary page invalidates pending results on input changes and guards stale responses', async () => {
  const app = await readFile(new URL('../src/App.vue', import.meta.url), 'utf8')
  assert.match(app, /watch\(searchText,\s*\(\)\s*=>\s*\{/)
  assert.match(app, /\{\s*flush:\s*'sync'\s*\}/)
  assert.match(app, /dictionaryFetchController\?\.abort\(\)/)
  assert.match(app, /dictionaryOnlineCache\.forgetPending\(\)/)
  assert.match(app, /requestId !== dictionaryRequestId/)
  assert.match(app, /new DictionaryRequestCache/)
})
