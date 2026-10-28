import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import ts from 'typescript'
const source = await readFile(new URL('../src/progress-sync.ts', import.meta.url), 'utf8')
const js = ts.transpile(source, { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext })
const { mergeExamHistory, restoreMasteredCard } = await import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'))
test('a new local exam record survives a stale cloud sync', () => {
  const result = mergeExamHistory([{ id:'old' }], [{ id:'old' }, { id:'new' }], ['old'])
  assert.deepEqual(result.map(x => x.id), ['old', 'new'])
  assert.deepEqual(mergeExamHistory([{ id:'old' }, { id:'new' }], [{ id:'old' }, { id:'new' }], ['old']).map(x => x.id), ['old','new'])
})
test('rolling back one card does not revert another card', () => {
  assert.deepEqual(restoreMasteredCard(['a', 'b'], 'a', false), ['b'])
  assert.deepEqual(restoreMasteredCard(['b'], 'a', true), ['b','a'])
})
const { hydrateMastery } = await import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'))
const checkpoint = () => {
  const done = new Set()
  return { done, has: id => done.has(id), add: ids => ids.forEach(id => done.add(id)) }
}
const okImport = options => ({ ok: true, status: 200, json: async () => ({ recognized_card_ids: JSON.parse(options.body).legacy_card_ids }) })
test('cloud cancellation wins over stale local completion; unrecognized legacy IDs remain', async () => {
  const calls = []
  const fakeFetch = async (url, options) => {
    calls.push(options)
    return options?.method === 'POST'
      ? { ok: true, status: 200, json: async () => ({ recognized_card_ids: ['a'] }) }
      : { ok: true, json: async () => ({ items: [{ card_id: 'a', mastered: 0 }, { card_id: 'b', mastered: 1 }] }) }
  }
  const progress = checkpoint()
  assert.deepEqual(await hydrateMastery(['a', 'unknown'], fakeFetch, progress), ['b', 'unknown'])
  assert.deepEqual(JSON.parse(calls[0].body), { legacy_card_ids: ['a', 'unknown'] })
  assert.deepEqual([...progress.done], ['a'])
})
test('failed imports and failed reads leave caller snapshot untouched', async () => {
  const original = ['a']
  await assert.rejects(hydrateMastery(original, async () => ({ ok: false }), checkpoint()))
  let n = 0
  await assert.rejects(hydrateMastery(original, async (_url, options) => ++n === 1 ? okImport(options) : { ok: false }, checkpoint()))
  assert.deepEqual(original, ['a'])
})
test('successful batches resume after a failed request without repeating them', async () => {
  const ids = Array.from({ length: 201 }, (_, i) => 'id' + i)
  const done = checkpoint()
  const sizes = []
  await assert.rejects(hydrateMastery(ids, async (_url, options) => {
    sizes.push(JSON.parse(options.body).legacy_card_ids.length)
    return sizes.length === 2 ? { ok: false } : okImport(options)
  }, done))
  assert.deepEqual(sizes, [100, 100])
  const retried = []
  await hydrateMastery(ids, async (_url, options) => {
    if (options?.method === 'POST') { retried.push(...JSON.parse(options.body).legacy_card_ids); return okImport(options) }
    return { ok: true, json: async () => ({ items: [] }) }
  }, done)
  assert.deepEqual(retried, ids.slice(100))
})
test('10,000 cards survive rate limiting and resume without repeating completed batches', async () => {
  const ids = Array.from({ length: 10000 }, (_, i) => 'id' + i)
  const done = checkpoint()
  let requests = 0, waits = 0
  const result = await hydrateMastery(ids, async (_url, options) => {
    if (!options) return { ok: true, json: async () => ({ items: [] }) }
    requests++
    if (requests === 61) return { ok: false, status: 429 }
    return okImport(options)
  }, done, async ms => { assert.equal(ms, 65000); waits++ })
  assert.equal(result.length, 10000)
  assert.equal(done.done.size, 10000)
  assert.equal(requests, 101)
  assert.equal(waits, 1)
})
