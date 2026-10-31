import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { DatabaseSync } from 'node:sqlite'
import ts from 'typescript'

let source = await readFile(new URL('../worker/index.ts', import.meta.url), 'utf8')
source = source.replace("import { checkWriteRateLimit, handleAuthRequest, requireAuth } from './auth'",
  "const checkWriteRateLimit=async()=>null; const handleAuthRequest=async()=>null; const requireAuth=async()=>null;")
source = source.replace("import { feSeeds, seedUrl } from './fe-question-bank'",
  "const feSeeds=[]; const seedUrl=()=>'';")
const worker = (await import('data:text/javascript;base64,' + Buffer.from(ts.transpile(source, {
  target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext,
})).toString('base64'))).default
const uuid = '11111111-1111-4111-8111-111111111111'
function setup() {
  const sql = new DatabaseSync(':memory:')
  sql.exec(`CREATE TABLE questions (
    id TEXT PRIMARY KEY, track_id TEXT, topic TEXT, difficulty TEXT, question_type TEXT,
    prompt TEXT, options_json TEXT, answer_json TEXT, explanation TEXT, source_type TEXT,
    source_reference TEXT, language TEXT, exam_section TEXT, exam_section_method TEXT);
    CREATE TABLE study_attempts (
      id TEXT PRIMARY KEY, question_id TEXT, user_answer_json TEXT, is_correct INTEGER,
      duration_seconds INTEGER, answered_at TEXT DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE question_review_state (
      question_id TEXT PRIMARY KEY, track_id TEXT, review_count INTEGER,
      correct_streak INTEGER, last_result TEXT, next_review_at TEXT,
      mastered INTEGER, updated_at TEXT);
  `)
  const stmt = sql.prepare(`INSERT INTO questions VALUES
    (?,'exam-sg','セキュリティ','standard','single_choice','test','[{"id":"a","text":"yes"},{"id":"b","text":"no"}]',
      '"a"','test explanation','generated','', 'ja','A','explicit')`)
  for (let i=0; i<65; i++) stmt.run('sg-reliability-' + String(i).padStart(3,'0'))
  let crash = false
  const DB = {
    prepare(query) { return { bind(...args) { return {
      first: async () => sql.prepare(query).get(...args) || null,
      all: async () => ({ results: sql.prepare(query).all(...args) }),
      run: async () => sql.prepare(query).run(...args),
    } } } },
    async batch(statements) {
      sql.exec('BEGIN')
      try {
        for(let i=0;i<statements.length;i++) {
          await statements[i].run()
          if(crash && i===0) throw new Error('outage')
        }
        sql.exec('COMMIT')
      } catch(e) {sql.exec('ROLLBACK');throw e}
    },
  }
  const post = (id=uuid,answer='a')=>worker.fetch(new Request('https://study.test/api/attempts', {
    method:'POST',headers:{origin:'https://study.test','content-type':'application/json'},
    body:JSON.stringify({attempt_id:id,question_id:'sg-reliability-000',answer,duration_seconds:1}),
  }),{DB})
  const get = (query)=>worker.fetch(new Request('https://study.test'+query),{DB})
  return { sql, post, get, setCrash(v){crash=v} }
}
test('individual retry with a fixed id saves one answer and one review event',async()=>{
  const {sql,post}=setup()
  const first=await post()
  assert.equal(first.status,201)
  assert.equal((await first.json()).correct,true)
  const repeat=await post()
  assert.equal(repeat.status,200)
  assert.equal((await repeat.json()).attempt_id,uuid)
  assert.equal(sql.prepare('SELECT count(*) n FROM study_attempts').get().n,1)
  assert.equal(sql.prepare("SELECT review_count FROM question_review_state WHERE question_id='sg-reliability-000'").get().review_count,1)
  assert.equal((await post(uuid,'b')).status,409)
})
test('an interrupted answer batch can be safely retried after rollback',async()=>{
  const state=setup();state.setCrash(true)
  assert.equal((await state.post()).status,503)
  assert.equal(state.sql.prepare('SELECT count(*) n FROM study_attempts').get().n,0)
  state.setCrash(false)
  assert.equal((await state.post()).status,201)
  assert.equal(state.sql.prepare('SELECT count(*) n FROM study_attempts').get().n,1)
})
test('review API exposes total, has_more and later pages beyond fifty items',async()=>{
  const {get}=setup()
  const page=await get('/api/wrong-questions?track=exam-sg&mode=unlearned&limit=10&offset=50')
  assert.equal(page.status,200)
  const body=await page.json()
  assert.equal(body.total,65)
  assert.equal(body.items.length,10)
  assert.equal(body.has_more,true)
  const final=await (await get('/api/wrong-questions?track=exam-sg&mode=unlearned&limit=10&offset=60')).json()
  assert.equal(final.total,65)
  assert.equal(final.items.length,5)
  assert.equal(final.has_more,false)
})
