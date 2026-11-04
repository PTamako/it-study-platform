import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import ts from 'typescript'

const root = new URL('../', import.meta.url)
const [libSource, worker, schema, component, app, idb] = await Promise.all([
  'src/listening-progress-sync.ts', 'worker/index.ts', 'migrations/0150_daily_listening_answers.sql',
  'src/DailyListeningPractice.vue', 'src/App.vue', 'src/offline-grammar-store.ts',
].map(file => readFile(new URL(file, root), 'utf8')))
const js = ts.transpileModule(libSource, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText
const lib = await import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'))
const scenes = [
  {id:'ja-d1',options:['a','b','c','d']},
  {id:'ja-w1',options:['a','b','c','d']},
]
test('offline listening snapshots validate, deduplicate and merge cloud-first', () => {
  assert.deepEqual(lib.validListeningAnswers(null,scenes),{})
  assert.deepEqual(lib.validListeningAnswers({'ja-d1':2,'ja-w1':8,unknown:0},scenes),{'ja-d1':2})
  const local = {'ja-d1':1,'ja-w1':3}, cloud = {'ja-d1':2}
  assert.deepEqual(lib.mergeListeningCloud(local,cloud,scenes),{'ja-d1':2,'ja-w1':3})
  assert.deepEqual(lib.pendingListeningAnswers(local,cloud,scenes),[{scene_id:'ja-w1',answer_index:3}])
  assert.deepEqual(lib.parseListeningCloud([{scene_id:'ja-d1',answer_index:2}],scenes),cloud)
  assert.throws(() => lib.parseListeningCloud([{scene_id:'wrong',answer_index:0}],scenes))
  assert.throws(() => lib.parseListeningCloud([{scene_id:'ja-d1',answer_index:4}],scenes))
  assert.throws(() => lib.parseListeningCloud([{scene_id:'ja-d1',answer_index:0},{scene_id:'ja-d1',answer_index:1}],scenes))
})

test('real SQLite schema preserves the first answer per scene and uses its primary key', () => {
  const python = String.raw`
import sqlite3,sys,json
db=sqlite3.connect(':memory:')
db.executescript(json.load(sys.stdin))
rows=[('2026-11-04','ja','ja-d1',1),('2026-11-04','ja','ja-w1',0)]
db.executemany('INSERT INTO daily_listening_answers(study_date,language,scene_id,answer_index) VALUES (?,?,?,?) ON CONFLICT(study_date,language,scene_id) DO NOTHING',rows)
db.execute("INSERT INTO daily_listening_answers(study_date,language,scene_id,answer_index) VALUES ('2026-11-04','ja','ja-d1',3) ON CONFLICT(study_date,language,scene_id) DO NOTHING")
assert db.execute("SELECT answer_index FROM daily_listening_answers WHERE study_date='2026-11-04' AND language='ja' AND scene_id='ja-d1'").fetchone()[0]==1
assert db.execute("SELECT COUNT(*) FROM daily_listening_answers").fetchone()[0]==2
plan=db.execute('EXPLAIN QUERY PLAN SELECT scene_id,answer_index FROM daily_listening_answers WHERE study_date=? AND language=? ORDER BY scene_id LIMIT 2',('2026-11-04','ja')).fetchall()
assert any('PRIMARY KEY' in str(row) for row in plan),plan
print('first-write and indexed query verified')
`
  const output = execFileSync('python3',['-c',python],{input:JSON.stringify(schema),encoding:'utf8'})
  assert.match(output,/indexed query verified/)
  assert.doesNotMatch(schema,/DROP TABLE|DELETE FROM|UPDATE /i)
})

test('API is authenticated, origin-checked and bounded to one daily and one workplace scene', () => {
  const auth = worker.slice(worker.indexOf('const protectedPersonalPaths'),worker.indexOf('export interface Env'))
  const methods = worker.slice(worker.indexOf('const isWriteEndpoint'),worker.indexOf('const isExamHistoryDelete'))
  assert.match(auth,/\/api\/listening-progress/)
  assert.match(methods,/\/api\/listening-progress/)
  const code = worker.slice(worker.indexOf('// Persist only two small answers per day'),worker.indexOf('// Language spaced repetition'))
  for (const part of ['LIMIT 2','answers.length > 2','new Set(answers.map','ON CONFLICT(study_date, language, scene_id) DO NOTHING','allowedIds.has(answer.scene_id)','return json({ ok: true, items: results })'])
    assert.ok(code.includes(part),part)
  assert.doesNotMatch(code,/SELECT \* FROM daily_listening_answers|DELETE FROM|DROP TABLE|AI\.run/)
})

test('offline PWA uses existing IDB connection, 1.8s batch and never uploads recorded audio', () => {
  for (const part of ["indexedDB.open('zhixue-offline-learning', 2)",'listening_answers','loadListeningOffline','saveListeningOffline'])
    assert.ok(idb.includes(part),part)
  for (const part of ['localStorage.setItem','loadListeningOffline','saveListeningOffline','pendingListeningAnswers','parseListeningCloud',
    'window.addEventListener','online','syncMessage','generation','setTimeout','recordingRun'])
    assert.ok(component.includes(part),part)
  assert.match(component,/body: JSON\.stringify\(\{ date: props\.studyDate, language: props\.language, answers: pending \}\)/)
  assert.match(app,/:authenticated="authenticated"/)
  assert.match(component,/const syncFailed = ref\(false\)/)
  assert.match(component,/v-if="authenticated && syncFailed"/)
  assert.match(component,/@click="syncCloud\(generation, true\)"/)
  assert.match(component,/syncMessage\.value = '已保存在本机 · 可手动重试同步'/)
  assert.doesNotMatch(component,/FormData|AI\.run\(|\/api\/record|uploadAudio\(/)
})
