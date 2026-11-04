import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import ts from 'typescript'

const root = new URL('../', import.meta.url)
const [store, worker, schema, component, app] = await Promise.all([
  'src/offline-grammar-store.ts', 'worker/index.ts',
  'migrations/0133_daily_grammar_answers.sql', 'src/DailyGrammarLesson.vue','src/App.vue',
].map(path => readFile(new URL(path, root), 'utf8')))
const js = ts.transpileModule(store, { compilerOptions: { target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext } }).outputText
const lib = await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'))
const questions = [
  {id:'en-01:today:0',options:['a','b','c','d']},
  {id:'en-01:today:1',options:['a','b','c','d']},
  {id:'en-12:review:0',options:['a','b','c','d']},
]

test('offline snapshots validate choices and merge cloud-first without dropping pending answers', () => {
  assert.deepEqual(lib.validGrammarAnswers(null,questions),{})
  assert.deepEqual(lib.validGrammarAnswers({'bad':1,'en-01:today:0':3,'en-01:today:1':12},questions),
    {'en-01:today:0':3})
  const offline = {'en-01:today:0':0,'en-01:today:1':2}
  const cloud = {'en-01:today:0':1,'en-12:review:0':3}
  assert.deepEqual(lib.mergeGrammarCloud(offline,cloud,questions),
    {'en-01:today:0':1,'en-01:today:1':2,'en-12:review:0':3})
  assert.deepEqual(lib.pendingGrammarAnswers(offline,cloud,questions),
    [{question_id:'en-01:today:1',answer_index:2}])
  assert.deepEqual(lib.parseGrammarCloud([{question_id:'en-01:today:0',answer_index:1}],questions),
    {'en-01:today:0':1})
  assert.throws(()=>lib.parseGrammarCloud([{question_id:'unknown',answer_index:0}],questions))
  assert.throws(()=>lib.parseGrammarCloud([{question_id:'en-01:today:0',answer_index:7}],questions))
  assert.throws(()=>lib.parseGrammarCloud([
    {question_id:'en-01:today:0',answer_index:0},
    {question_id:'en-01:today:0',answer_index:1},
  ],questions))
})

test('real SQLite migration is additive, indexed and first-write-wins', () => {
  const python = String.raw`
import sys,json,sqlite3
sql=json.load(sys.stdin)
db=sqlite3.connect(':memory:')
db.executescript(sql)
rows=[('2026-11-03','en','en-01:today:0',2),('2026-11-03','en','en-01:today:1',0),('2026-11-03','en','en-12:review:0',1)]
db.executemany('INSERT INTO daily_grammar_answers(study_date,language,question_id,answer_index) VALUES (?,?,?,?) ON CONFLICT(study_date,language,question_id) DO NOTHING',rows)
db.execute("INSERT INTO daily_grammar_answers(study_date,language,question_id,answer_index) VALUES ('2026-11-03','en','en-01:today:0',3) ON CONFLICT(study_date,language,question_id) DO NOTHING")
answer=db.execute("SELECT answer_index FROM daily_grammar_answers WHERE study_date='2026-11-03' AND language='en' AND question_id='en-01:today:0'").fetchone()
assert answer[0]==2,'first write must win'
assert db.execute("SELECT COUNT(*) FROM daily_grammar_answers").fetchone()[0]==3
plan=db.execute("EXPLAIN QUERY PLAN SELECT question_id,answer_index FROM daily_grammar_answers WHERE study_date=? AND language=? ORDER BY question_id LIMIT 3",('2026-11-03','en')).fetchall()
assert any('PRIMARY KEY' in str(row) for row in plan),plan
print('safe batch + PK index verified')
`
  const output = execFileSync('python3',['-c',python],{input:JSON.stringify(schema),encoding:'utf8'})
  assert.match(output,/PK index verified/)
  assert.doesNotMatch(schema,/DROP TABLE|DELETE FROM/i)
})

test('cloud API requires existing authentication, origin and bounded per-day writes', () => {
  const auth = worker.slice(worker.indexOf('const protectedPersonalPaths'),worker.indexOf('export interface Env'))
  const methods = worker.slice(worker.indexOf('const isWriteEndpoint'),worker.indexOf('const isExamHistoryDelete'))
  assert.match(auth,/\/api\/grammar-progress/)
  assert.match(methods,/\/api\/grammar-progress/)
  const code = worker.slice(worker.indexOf("// Indexed, three-answers-per-day"),worker.indexOf("// Language spaced repetition"))
  for(const snippet of ['WHERE study_date = ? AND language = ?','LIMIT 3','answers.length > 3','new Set(answers.map','ON CONFLICT(study_date, language, question_id) DO NOTHING'])
    assert.ok(code.includes(snippet),snippet)
  assert.doesNotMatch(code,/SELECT \* FROM daily_grammar_answers|DELETE FROM|DROP TABLE|AI\.run/)
})

test('PWA persists offline in IDB + localStorage and performs one debounced cloud batch', () => {
  for(const snippet of ['indexedDB.open','createObjectStore','saveGrammarOffline','loadGrammarOffline'])
    assert.ok(store.includes(snippet),snippet)
  for(const snippet of ['localStorage.setItem','window.addEventListener','online','setTimeout','pendingGrammarAnswers','parseGrammarCloud','syncMessage','generation'])
    assert.ok(component.includes(snippet),snippet)
  assert.match(component,/body: JSON\.stringify\(\{ date: props\.studyDate, language: props\.language, answers: pending \}\)/)
  assert.match(app,/:authenticated="authenticated"/)
  assert.match(component,/const syncFailed = ref\(false\)/)
  assert.match(component,/v-if="authenticated && syncFailed"/)
  assert.match(component,/@click="syncCloud\(generation, true\)"/)
  assert.match(component,/syncMessage\.value = '已保存在本机 · 可手动重试同步'/)
  assert.doesNotMatch(store,/\/api\/dictionary|Workers AI/)
})
