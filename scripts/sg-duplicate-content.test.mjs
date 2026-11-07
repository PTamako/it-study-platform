import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
const migration = readFileSync(new URL('../migrations/0153_disambiguate_sg_generated_prompt.sql',import.meta.url),'utf8')

test('reword only one duplicated original SG prompt, preserving answers and history',()=>{
  const db = new DatabaseSync(':memory:')
  try {
    db.exec('CREATE TABLE questions(id TEXT PRIMARY KEY,prompt TEXT,answer_json TEXT); CREATE TABLE study_attempts(id TEXT,question_id TEXT);')
    const original = 'サービスの可用性を高める対策として最も適切なものはどれか。'
    db.prepare('INSERT INTO questions VALUES(?,?,?)').run('sg-practice-0024',original,'"b"')
    db.prepare('INSERT INTO questions VALUES(?,?,?)').run('sg-gen-0028',original,'"a"')
    db.prepare('INSERT INTO study_attempts VALUES(?,?)').run('attempt-1','sg-practice-0024')
    db.exec(migration)
    db.exec(migration)
    const rows=db.prepare('SELECT id,prompt,answer_json FROM questions ORDER BY id').all()
    assert.notEqual(rows[0].prompt,rows[1].prompt)
    assert.equal(rows.find(row=>row.id==='sg-practice-0024').answer_json,'"b"')
    assert.equal(rows.find(row=>row.id==='sg-gen-0028').prompt,original)
    assert.equal(db.prepare('SELECT COUNT(*) n FROM study_attempts').get().n,1)
  } finally {db.close()}
})
