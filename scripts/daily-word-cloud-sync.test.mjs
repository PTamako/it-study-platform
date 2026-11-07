import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import ts from 'typescript'

const source = await readFile(new URL('../src/daily-word-cloud-sync.ts', import.meta.url), 'utf8')
const script = ts.transpileModule(source, { compilerOptions: {
  target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext,
} }).outputText
const { mergeDailyWordSnapshots, pendingDailyWordSnapshots, sameDayWordConflict } =
  await import('data:text/javascript;base64,' + Buffer.from(script).toString('base64'))
const worker = await readFile(new URL('../worker/index.ts', import.meta.url), 'utf8')
const app = await readFile(new URL('../src/App.vue', import.meta.url), 'utf8')
const migration = await readFile(new URL('../migrations/0152_daily_word_reviews.sql', import.meta.url), 'utf8')

test('cross-device word merge uses later day, and remote wins a same-day tie', () => {
  const local = {
    'ja:報告': { streak: 2, lastDate: '2026-11-07', nextDate: '2026-11-10' },
    'en:request': { streak: 1, lastDate: '2026-11-06', nextDate: '2026-11-07' },
  }
  const remote = {
    'ja:報告': { streak: 0, lastDate: '2026-11-07', nextDate: '2026-11-08' },
    'en:request': { streak: 3, lastDate: '2026-11-05', nextDate: '2026-11-12' },
    'en:meeting': { streak: 2, lastDate: '2026-11-04', nextDate: '2026-11-07' },
  }
  const merged = mergeDailyWordSnapshots(local, remote)
  assert.deepEqual(merged['ja:報告'], remote['ja:報告'])
  assert.deepEqual(merged['en:request'], local['en:request'])
  assert.deepEqual(merged['en:meeting'], remote['en:meeting'])
  assert.deepEqual(Object.keys(pendingDailyWordSnapshots(local, remote)), ['en:request'])
})

test('recall D1 migration is additive, authenticated and conflict-safe', () => {
  assert.match(migration, /CREATE TABLE IF NOT EXISTS daily_word_reviews/)
  assert.doesNotMatch(migration, /DROP TABLE|DELETE FROM|UPDATE questions/i)
  const protectedBlock = worker.match(/const protectedPersonalPaths = new Set\(\[([\s\S]*?)\]\)/)?.[1] || ''
  assert.match(protectedBlock, /'\/api\/daily-word-reviews'/)
  assert.match(worker, /WHERE excluded.last_date > daily_word_reviews.last_date/)
  assert.match(worker, /FROM json_each\(\?\) WHERE 1 = 1/)
  assert.match(worker, /items.length > 50/)
  assert.match(app, /hydrateDailyWordProgress\(\)/)
  assert.match(app, /dailyWordPending.value/)
  assert.match(app, /flushDailyWordProgress\(\)/)
})

test('daily word panel hydrates before fixing selection, shows offline state and permits manual retry', () => {
  assert.match(app, /const dailyWordSyncState = ref<'loading' \| 'ready' \| 'offline'>\('loading'\)/)
  assert.match(app,/dailyWordSyncState\.value === 'loading' \|\| !authenticated\.value/)
  assert.match(app,/dailyWordSyncState\.value === 'ready'\) pinDailyWords/)
  assert.match(app,/dailyWordSyncState\.value = 'ready'/)
  assert.match(app,/dailyWordSyncState\.value = 'offline'/)
  assert.match(app,/next_cursor/)
  assert.match(app,/hydrateDailyWordProgress">重新同步/)
})

test('same-day grades with different outcomes trigger explicit conflict resolution',()=>{
  const a={streak:1,lastDate:'2026-11-07',nextDate:'2026-11-08'}
  const b={streak:0,lastDate:'2026-11-07',nextDate:'2026-11-09'}
  assert.equal(sameDayWordConflict(a,b),true)
  assert.equal(sameDayWordConflict(a,{...a}),false)
  assert.equal(sameDayWordConflict(a,{...b,lastDate:'2026-11-06'}),false)
  assert.match(app,/resolveDailyWordConflict\(key, true\)/)
})
