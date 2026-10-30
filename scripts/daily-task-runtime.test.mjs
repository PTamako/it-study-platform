import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { stripTypeScriptTypes } from 'node:module'
import vm from 'node:vm'

const app = readFileSync(new URL('../src/App.vue', import.meta.url), 'utf8')
const segment = app.slice(app.indexOf('const dailyTaskSaveQueues'), app.indexOf('let dailyRolloverTimer'))
function harness(fetch, date = '2026-10-28', day = date, storage = new Map()) {
  const context = vm.createContext({ fetch, Promise, Map, Set, reactive: value => value, authenticated: { value: true },
    todayKey: { value: date }, tasks: { value: [{ id: 'x', done: true }] },
    defaultTasks: [{ id: 'x', done: false }], cloudDashboardError: { value: '' },
    tokyoDate: () => day, readStored: (key, fallback) => storage.has(key) ? JSON.parse(storage.get(key)) : fallback,
    localStorage: { setItem: (key, value) => storage.set(key, value) },
    mergeDailyTaskStates: (current, cloud, unchanged) => current.map(t => {
      const row = cloud.find(x => x.task_id === t.id)
      return row && unchanged(t.id) ? { ...t, done: Boolean(row.completed) } : t
    }), loadCloudDashboard: async () => {} })
  vm.runInContext(stripTypeScriptTypes(segment, { mode: 'strip' }) + '\nthis.api = { rolloverDailyTasks, toggleDailyTask, refreshDailyTasks, reconcilePriorDailyTasks, retryPendingDailyTask, intents: pendingDailyTasks, invalidate: () => { dailyHydrationRun++ }, pending: dailyTaskSaveQueues }', context)
  return context
}
test('click immediately after midnight toggles the new day instead of the old DOM state', async () => {
  const writes = []
  const c = harness(async (url, opts) => { if (opts?.method === 'POST') { writes.push(JSON.parse(opts.body)); return { ok: true } } return { ok: true, json: async () => ({ items: [] }) } }, '2026-10-28', '2026-10-29')
  c.api.toggleDailyTask('x', false)
  await Promise.all([...c.api.pending.values()])
  assert.equal(c.tasks.value[0].done, true)
  assert.equal(writes.at(-1).study_date, '2026-10-29')
  assert.equal(writes.at(-1).completed, true)
})
test('late response from signed-out session cannot update the new session', async () => {
  let release
  const response = new Promise(resolve => { release = resolve })
  const c = harness(async (_url, opts) => opts?.method === 'POST' ? { ok: true } : response)
  const loading = c.api.refreshDailyTasks('2026-10-28')
  await Promise.resolve(); await Promise.resolve()
  c.authenticated.value = false; c.api.invalidate(); c.authenticated.value = true
  release({ ok: true, json: async () => ({ items: [{ task_id: 'x', completed: 0 }] }) })
  await loading
  assert.equal(c.tasks.value[0].done, true)
})
test('cloud read started after local click cannot overwrite a pending write', async () => {
  let release
  const post = new Promise(resolve => { release = resolve })
  const c = harness(async (_url, opts) => opts?.method === 'POST' && !JSON.parse(opts.body).import_only ? post : opts?.method === 'POST' ? {ok:true} : {ok:true,json:async()=>({items:[{task_id:'x',completed:0}]})})
  c.api.toggleDailyTask('x', true)
  await c.api.refreshDailyTasks('2026-10-28')
  assert.equal(c.tasks.value[0].done, true)
  release({ok:true})
  await Promise.all([...c.api.pending.values()])
})

test('failed explicit action survives reload and requires explicit retry', async () => {
  const storage = new Map()
  const a = harness(async () => ({ok:false,json:async()=>({})}), '2026-10-28', '2026-10-28', storage)
  a.tasks.value[0].done = false
  a.api.toggleDailyTask('x', true)
  await Promise.all([...a.api.pending.values()])
  assert.equal(JSON.parse(storage.get('zhixue:daily-pending-v1'))[0].completed, true)
  const requests = []
  const b = harness(async (_url, options) => {
    if (!options) return {ok:true,json:async()=>({items:[{task_id:'x',completed:0}]})}
    requests.push(JSON.parse(options.body)); return {ok:true}
  }, '2026-10-28', '2026-10-28', storage)
  await b.api.refreshDailyTasks('2026-10-28')
  await Promise.all([...b.api.pending.values()])
  assert.equal(b.tasks.value[0].done, true)
  assert.equal(requests.length, 0)
  assert.equal(JSON.parse(storage.get('zhixue:daily-pending-v1')).length, 1)
  b.api.retryPendingDailyTask([...b.api.intents.values()][0])
  await Promise.all([...b.api.pending.values()])
  assert.equal(requests[0].completed, true)
  assert.equal(JSON.parse(storage.get('zhixue:daily-pending-v1')).length, 0)
})
test('queued rapid toggles retain final intent when the later write fails', async () => {
  const storage = new Map(); let count = 0
  const c = harness(async () => ({ok:++count === 1,json:async()=>({})}), '2026-10-28', '2026-10-28', storage)
  c.tasks.value[0].done = false
  c.api.toggleDailyTask('x', true); c.api.toggleDailyTask('x', false)
  await Promise.all([...c.api.pending.values()])
  const pending = JSON.parse(storage.get('zhixue:daily-pending-v1'))[0]
  assert.equal(pending.completed, false); assert.equal(pending.base, true)
})
test('prior-day explicit failures require retry using their original date', async () => {
  const storage = new Map(); const requests = []
  storage.set('zhixue:daily-pending-v1', JSON.stringify([{id:'pending',date:'2026-10-28',taskId:'x',base:false,completed:true}]))
  const c = harness(async (_url, options) => {
    if (!options) return {ok:true,json:async()=>({items:[]})}
    requests.push(JSON.parse(options.body)); return {ok:true}
  }, '2026-10-29', '2026-10-29', storage)
  await c.api.reconcilePriorDailyTasks()
  assert.equal(requests.length, 0)
  c.api.retryPendingDailyTask([...c.api.intents.values()][0])
  await Promise.all([...c.api.pending.values()])
  assert.equal(requests[0].study_date, '2026-10-28')
  assert.equal(requests[0].completed, true)
  assert.equal(JSON.parse(storage.get('zhixue:daily-pending-v1')).length, 0)
})

test('an ABA remote change cannot trigger a background overwrite', async () => {
  const storage = new Map()
  storage.set('zhixue:daily-pending-v1', JSON.stringify([{id:'p',date:'2026-10-28',taskId:'x',base:false,completed:true}]))
  const writes=[]
  const c=harness(async (_url,options)=>options ? (writes.push(JSON.parse(options.body)),{ok:true}) : {ok:true,json:async()=>({items:[{task_id:'x',completed:0}]})},'2026-10-28','2026-10-28',storage)
  await c.api.refreshDailyTasks('2026-10-28')
  assert.equal(writes.length,0)
  assert.equal(c.api.intents.size,1)
})

test('successful old request does not clear newer intent after session change', async () => {
  const storage = new Map(); let resolveFirst
  const first = new Promise(resolve => { resolveFirst = resolve })
  let writes = 0
  const c = harness(async (_url,options) => {
    if (!options) return {ok:true,json:async()=>({items:[]})}
    if (++writes === 1) return first
    return {ok:false,json:async()=>({})}
  }, '2026-10-28', '2026-10-28', storage)
  c.tasks.value[0].done = false
  c.api.toggleDailyTask('x', true)
  await Promise.resolve()
  c.authenticated.value = false; c.api.invalidate(); c.authenticated.value = true
  c.api.toggleDailyTask('x', false)
  resolveFirst({ok:true})
  await Promise.all([...c.api.pending.values()])
  const pending=JSON.parse(storage.get('zhixue:daily-pending-v1'))
  assert.equal(pending.length,1)
  assert.equal(pending[0].completed,false)
})
test('prior-day successful write does not clear next-day pending intent', async () => {
  const storage=new Map(); let release
  const first=new Promise(resolve=>{release=resolve})
  storage.set('zhixue:daily-pending-v1',JSON.stringify([{id:'old',date:'2026-10-28',taskId:'x',base:false,completed:true}]))
  const c = harness(async (_url,opts) => {
    if(!opts) return {ok:true,json:async()=>({items:[]})}
    const body=JSON.parse(opts.body)
    if(body.import_only)return {ok:true}
    return body.study_date==='2026-10-28' ? first : {ok:false,json:async()=>({})}
  },'2026-10-29','2026-10-29',storage)
  c.api.retryPendingDailyTask([...c.api.intents.values()][0])
  await Promise.resolve()
  c.api.toggleDailyTask('x',false)
  release({ok:true})
  await Promise.all([...c.api.pending.values()])
  const remaining=JSON.parse(storage.get('zhixue:daily-pending-v1'))
  assert.equal(remaining.length,1)
  assert.equal(remaining[0].date,'2026-10-29')
  assert.equal(remaining[0].completed,false)
})
