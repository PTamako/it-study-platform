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
test('cloud cancellation wins over stale local completion; unrecognized legacy IDs remain', async () => {
  const calls = []
  const fakeFetch = async (url, options) => {
    calls.push(options)
    return options?.method === 'POST'
      ? { ok: true }
      : { ok: true, json: async () => ({ items: [{ card_id: 'a', mastered: 0 }, { card_id: 'b', mastered: 1 }] }) }
  }
  assert.deepEqual(await hydrateMastery(['a', 'unknown'], fakeFetch), ['b', 'unknown'])
  assert.deepEqual(JSON.parse(calls[0].body), { legacy_card_ids: ['a', 'unknown'] })
})
test('failed imports and failed reads leave caller snapshot untouched', async () => {
  const original = ['a']
  await assert.rejects(hydrateMastery(original, async () => ({ ok: false })))
  let n = 0
  await assert.rejects(hydrateMastery(original, async () => ++n === 1 ? { ok: true } : { ok: false }))
  assert.deepEqual(original, ['a'])
})
test('legacy import is chunked and stops on failure', async () => {
  const ids = Array.from({ length: 201 }, (_, i) => 'id' + i)
  const sizes = []
  await assert.rejects(hydrateMastery(ids, async (_url, options) => {
    sizes.push(JSON.parse(options.body).legacy_card_ids.length)
    return { ok: sizes.length === 2 ? false : true }
  }))
  assert.deepEqual(sizes, [100, 100])
})
