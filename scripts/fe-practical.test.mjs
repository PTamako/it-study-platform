import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { DatabaseSync } from 'node:sqlite'
import ts from 'typescript'

const migrationA = await readFile(new URL('../migrations/0111_fe_practical_subject_a.sql', import.meta.url), 'utf8')
const migrationB = await readFile(new URL('../migrations/0112_fe_practical_subject_b.sql', import.meta.url), 'utf8')
function setup() {
  const sql = new DatabaseSync(':memory:')
  sql.exec(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE study_tracks (id TEXT PRIMARY KEY);
    INSERT INTO study_tracks VALUES ('exam-fe'), ('exam-sg');
    CREATE TABLE practical_scenarios (
      id TEXT PRIMARY KEY,
      track_id TEXT NOT NULL REFERENCES study_tracks(id),
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      difficulty TEXT NOT NULL DEFAULT 'standard',
      situation TEXT NOT NULL,
      task TEXT NOT NULL,
      options_json TEXT NOT NULL,
      best_option TEXT NOT NULL,
      scoring_json TEXT NOT NULL,
      explanation TEXT NOT NULL,
      source_type TEXT NOT NULL DEFAULT 'authored',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE scenario_attempts (
      id TEXT PRIMARY KEY, scenario_id TEXT NOT NULL REFERENCES practical_scenarios(id),
      track_id TEXT NOT NULL REFERENCES study_tracks(id), selected_option TEXT NOT NULL,
      score INTEGER NOT NULL, feedback TEXT NOT NULL DEFAULT '', duration_seconds INTEGER NOT NULL DEFAULT 0,
      answered_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    INSERT INTO practical_scenarios
    (id,track_id,title,category,situation,task,options_json,best_option,scoring_json,explanation)
    VALUES ('sg-unchanged','exam-sg','SGの既存実戦','セキュリティ','既存','対応を選ぶ',
      '[{"id":"a","text":"回答A"},{"id":"b","text":"回答B"}]', 'a','{"a":100,"b":0}','SGの既存解説');
    INSERT INTO scenario_attempts (id,scenario_id,track_id,selected_option,score)
    VALUES ('sg-attempt','sg-unchanged','exam-sg','a',100);
  `)
  sql.exec(migrationA)
  sql.exec(migrationB)
  return sql
}

test('FE practical migrations add 50 original A/B cases without modifying SG data', () => {
  const db = setup()
  const groups = db.prepare("SELECT exam_section, COUNT(*) n FROM practical_scenarios WHERE track_id = 'exam-fe' GROUP BY exam_section").all()
  assert.deepEqual(groups.map(row => [row.exam_section, row.n]), [['A', 24], ['B', 26]])
  assert.equal(db.prepare("SELECT COUNT(*) n FROM practical_scenarios WHERE track_id = 'exam-sg'").get().n,1)
  assert.equal(db.prepare("SELECT title FROM practical_scenarios WHERE id = 'sg-unchanged'").get().title,'SGの既存実戦')
  assert.equal(db.prepare("SELECT COUNT(*) n FROM scenario_attempts WHERE id = 'sg-attempt'").get().n,1)
  assert.equal(db.prepare("SELECT COUNT(*) n FROM practical_scenarios WHERE track_id='exam-fe' AND source_type='authored'").get().n,50)
  db.close()
})

test('every FE scenario is answerable, Japanese, unambiguous and scored deterministically', () => {
  const db = setup()
  const rows = db.prepare("SELECT * FROM practical_scenarios WHERE track_id = 'exam-fe' ORDER BY id").all()
  assert.equal(new Set(rows.map(row => row.id)).size,50)
  for (const row of rows) {
    assert.match(row.id, /^fe-scenario-[ab]-\d{3}$/)
    assert.equal(row.exam_section, row.id.includes('-a-') ? 'A' : 'B')
    assert.ok(row.title.length > 2 && row.situation.length > 18 && row.explanation.length > 18,row.id)
    assert.ok(/[ぁ-んァ-ン一-龯]/.test(row.situation),row.id)
    assert.ok(['standard','intermediate'].includes(row.difficulty),row.id)
    const choices = JSON.parse(row.options_json)
    const scores = JSON.parse(row.scoring_json)
    assert.deepEqual(choices.map(option => option.id),['a','b','c','d'],row.id)
    assert.equal(new Set(choices.map(option => option.text)).size,4,row.id)
    assert.ok(choices.every(option => typeof option.text === 'string' && option.text.length > 1),row.id)
    assert.ok(choices.some(option => option.id === row.best_option),row.id)
    assert.equal(scores[row.best_option],100,row.id)
    assert.equal(Object.values(scores).filter(value => value === 100).length,1,row.id)
    assert.ok(choices.every(option => scores[option.id] === (option.id === row.best_option ? 100 : 0)),row.id)
  }
  db.exec(migrationA.replace(/^ALTER TABLE .*\n/m,'').replace(/^CREATE INDEX .*\n/m,''))
  db.exec(migrationB)
  assert.equal(db.prepare("SELECT COUNT(*) n FROM practical_scenarios WHERE track_id = 'exam-fe'").get().n,50,'repeated seed must not duplicate rows')
  db.close()
})

let workerSource = await readFile(new URL('../worker/index.ts', import.meta.url), 'utf8')
workerSource = workerSource.replace("import { checkWriteRateLimit, handleAuthRequest, requireAuth } from './auth'",
  "const checkWriteRateLimit=async()=>null; const handleAuthRequest=async()=>null; const requireAuth=async()=>null;")
workerSource = workerSource.replace("import { feSeeds, seedUrl } from './fe-question-bank'",
  "const feSeeds=[]; const seedUrl=()=>'';")
const worker = (await import('data:text/javascript;base64,' + Buffer.from(ts.transpile(workerSource, {
  target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext,
})).toString('base64'))).default

test('scenarios API isolates FE from SG and exposes A/B section without leaking answers', async () => {
  const sql=setup()
  const DB={prepare(query){return{bind(...args){return{
    all:async()=>({results:sql.prepare(query).all(...args)}),
    first:async()=>sql.prepare(query).get(...args)||null,
  }}}}}
  const get = async track => {
    const response=await worker.fetch(new Request('https://study.test/api/scenarios?track='+track),{DB})
    assert.equal(response.status,200)
    return (await response.json()).items
  }
  const fe=await get('exam-fe')
  const sg=await get('exam-sg')
  assert.equal(fe.length,50)
  assert.deepEqual(new Set(fe.map(item=>item.exam_section)),new Set(['A','B']))
  assert.equal(sg.length,1)
  assert.equal(sg[0].exam_section,null)
  assert.ok(fe.every(item=>Array.isArray(item.options) && !('best_option' in item) && !('scoring_json' in item)))
  assert.ok(fe.every(item=>item.track_id==='exam-fe'))
  sql.close()
})

test('FE practical UI has independent subject and category filters and keeps SG accessible',async()=>{
  const app=await readFile(new URL('../src/App.vue',import.meta.url),'utf8')
  assert.match(app,/const practicalSection = ref<'all' \| 'A' \| 'B'>\('all'\)/)
  assert.match(app,/const visibleScenarios = computed/)
  assert.match(app,/visibleScenarios\.value\.findIndex/)
  assert.match(app,/aria-label="FE 实战训练科目"/)
  assert.match(app,/aria-label="实战训练分野"/)
  assert.match(app,/item\.id === 'exam-sg' \|\| item\.id === 'exam-fe'/)
})
