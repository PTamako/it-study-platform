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
