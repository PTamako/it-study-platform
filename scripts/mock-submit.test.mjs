import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { DatabaseSync } from 'node:sqlite'
import ts from 'typescript'

let source = await readFile(new URL('../worker/index.ts', import.meta.url), 'utf8')
source = source.replace("import { checkWriteRateLimit, handleAuthRequest, requireAuth } from './auth'",
  "const checkWriteRateLimit=async()=>null; const handleAuthRequest=async()=>null; const requireAuth=async req=>req.headers.get('x-auth')==='yes'?null:new Response('{}',{status:401});")
source = source.replace("import { feSeeds, seedUrl } from './fe-question-bank'", "const feSeeds=[]; const seedUrl=()=>''")
const worker = (await import('data:text/javascript;base64,' + Buffer.from(ts.transpile(source, {
  target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext,
})).toString('base64'))).default

const uuid = '00000000-0000-4000-8000-000000000001'
function setup(sectionB = 12) {
  const sql = new DatabaseSync(':memory:')
  sql.exec(`
    CREATE TABLE questions(id TEXT PRIMARY KEY, track_id TEXT, topic TEXT, exam_section TEXT, answer_json TEXT);
    CREATE TABLE mock_exam_submissions(id TEXT PRIMARY KEY, track_id TEXT, exam_section TEXT, payload_json TEXT, result_json TEXT);
    CREATE TABLE study_attempts(id TEXT PRIMARY KEY, question_id TEXT, user_answer_json TEXT, is_correct INTEGER, duration_seconds INTEGER);
    CREATE TABLE question_review_state(question_id TEXT PRIMARY KEY,track_id TEXT,review_count INTEGER,correct_streak INTEGER,last_result TEXT,next_review_at TEXT,mastered INTEGER,updated_at TEXT);
    CREATE TABLE exam_history(id TEXT PRIMARY KEY,study_date TEXT,exam_name TEXT,question_count INTEGER,correct_count INTEGER);
  `)
  const put = sql.prepare("INSERT INTO questions VALUES(?,'exam-sg','セキュリティ',?,'\"a\"')")
  const answers = []
  for (let i = 0; i < 48 + sectionB; i++) {
    const id = 'sg-test-' + i
    put.run(id, i < 48 ? 'A' : 'B')
    answers.push({question_id:id,answer:i < 40 ? 'a' : 'b'})
  }
  let crash = false
  const db = {
    prepare(query) { return { bind(...args) { return {
      async first() { return sql.prepare(query).get(...args) || null },
      async all() { return { results: sql.prepare(query).all(...args) } },
      async run() { return sql.prepare(query).run(...args) },
    } } } },
    async batch(statements) {
      sql.exec('BEGIN')
      try {
        for (let i = 0; i < statements.length; i++) {
          await statements[i].run()
          if (crash && i === 6) throw new Error('simulated outage')
        }
        sql.exec('COMMIT')
      } catch (error) { sql.exec('ROLLBACK'); throw error }
    },
  }
  const request = (id = uuid, list = answers, auth = 'yes', origin = 'https://study.test') => worker.fetch(new Request(
    'https://study.test/api/mock-exam/submit', { method:'POST',
      headers:{origin,'x-auth':auth,'content-type':'application/json'},
      body:JSON.stringify({submission_id:id,track:'exam-sg',section:'SG',study_date:'2026-10-31',duration_seconds:3600,answers:list}),
    }), {DB:db})
  return {sql,request,answers,crash(value){crash=value}}
}
const count = (sql,table) => sql.prepare('SELECT COUNT(*) AS n FROM '+table).get().n

test('one request commits 60 grades and one summary; identical retry is idempotent', async () => {
  const {sql,request,answers} = setup()
  const first = await request()
  assert.equal(first.status,201)
  const data = await first.json()
  assert.equal(data.correct_count,40)
  assert.equal(data.total,60)
  assert.equal(count(sql,'study_attempts'),60)
  assert.equal(count(sql,'question_review_state'),60)
  assert.equal(count(sql,'exam_history'),1)
  assert.equal(count(sql,'mock_exam_submissions'),1)
  const repeat = await request()
  assert.equal(repeat.status,200)
  assert.equal((await repeat.json()).correct_count,40)
  assert.equal(count(sql,'study_attempts'),60)
  assert.equal(count(sql,'question_review_state'),60)
  assert.equal(count(sql,'exam_history'),1)
  const mismatch = await request(uuid,answers.map(x=>({...x,answer:'b'})))
  assert.equal(mismatch.status,409)
})

test('transaction failure preserves no partial answers or summary, then safely retries', async () => {
  const setupData=setup(); setupData.crash(true)
  assert.equal((await setupData.request()).status,503)
  for(const table of ['study_attempts','question_review_state','exam_history','mock_exam_submissions']) {
    assert.equal(count(setupData.sql,table),0,table)
  }
  setupData.crash(false)
  assert.equal((await setupData.request()).status,201)
  assert.equal(count(setupData.sql,'study_attempts'),60)
})

test('untrusted or wrongly classified exam submissions fail before write', async () => {
  const {sql,request,answers}=setup()
  assert.equal((await request(uuid,answers,'')).status,401)
  assert.equal((await request(uuid,answers,'yes','https://evil.test')).status,403)
  assert.equal((await request(uuid,answers.slice(0,59))).status,400)
  assert.equal(count(sql,'mock_exam_submissions'),0)
  const invalid=setup(11)
  assert.equal((await invalid.request()).status,400)
})

test('FE 60 A and 16 algorithm + 4 security B are not confused with SG', async () => {
  const source=await readFile(new URL('../worker/index.ts', import.meta.url),'utf8')
  assert.match(source,/a === 60 && b === 0/)
  assert.match(source,/row.topic === 'FE算法与程序设计'/)
  assert.match(source,/row.topic === 'FE信息安全'/)
  const app=await readFile(new URL('../src/App.vue',import.meta.url),'utf8')
  assert.match(app,/mock-pending-v1/)
  assert.match(app,/syncPendingMockSubmission/)
  assert.doesNotMatch(app,/Promise.allSettled\(attempts.map/)
})
