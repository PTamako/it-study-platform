import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'

const migration = readFileSync(new URL('../migrations/0151_fix_sg_prediction_answer_json.sql', import.meta.url), 'utf8')
const worker = readFileSync(new URL('../worker/index.ts', import.meta.url), 'utf8')

test('legacy SG malformed answer is repaired additively and idempotently', () => {
  const db = new DatabaseSync(':memory:')
  try {
    db.exec("CREATE TABLE questions(id TEXT PRIMARY KEY, answer_json TEXT); CREATE TABLE study_attempts(id TEXT PRIMARY KEY,question_id TEXT);")
    db.prepare('INSERT INTO questions VALUES (?,?)').run('sg-pred-bulk-452','"b')
    db.prepare('INSERT INTO questions VALUES (?,?)').run('sg-safe','"a"')
    db.prepare('INSERT INTO study_attempts VALUES (?,?)').run('keep','sg-pred-bulk-452')
    db.exec(migration)
    db.exec(migration)
    assert.equal(db.prepare("SELECT answer_json FROM questions WHERE id='sg-pred-bulk-452'").get().answer_json,'"b"')
    assert.equal(db.prepare("SELECT json_valid(answer_json) AS valid FROM questions WHERE id='sg-pred-bulk-452'").get().valid,1)
    assert.equal(db.prepare("SELECT answer_json FROM questions WHERE id='sg-safe'").get().answer_json,'"a"')
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM study_attempts').get().n,1)
  } finally { db.close() }
})

test('heavy public exam routes are authentication protected and track counts are aggregated once', () => {
  const block = worker.match(/const protectedPersonalPaths = new Set\(\[([\s\S]*?)\]\)/)?.[1] || ''
  for(const endpoint of ['/api/questions','/api/mock-exam-questions','/api/tracks','/api/scenarios'])
    assert.ok(block.includes("'" + endpoint + "'"), endpoint + ' is not protected')
  const query = worker.slice(worker.indexOf("if (url.pathname === '/api/tracks')"),worker.indexOf("if (url.pathname === '/api/translate-explanation'"))
  assert.match(query, /FROM questions GROUP BY track_id/)
  assert.doesNotMatch(query, /SELECT COUNT\(\*\) FROM questions q WHERE q.track_id = st.id/)
})
