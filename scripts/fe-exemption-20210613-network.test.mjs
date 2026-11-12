import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'

test('2021 network and security questions import idempotently without changing existing study state', () => {
  const db = new DatabaseSync(':memory:')
  try {
    db.exec(`PRAGMA foreign_keys=ON;
      CREATE TABLE questions(id TEXT PRIMARY KEY,track_id TEXT,topic TEXT,difficulty TEXT,question_type TEXT,prompt TEXT,options_json TEXT,answer_json TEXT,explanation TEXT,source_type TEXT,source_reference TEXT,language TEXT,exam_section TEXT,exam_section_method TEXT,question_kind TEXT,exam_origin TEXT);
      CREATE TABLE fe_exemption_occurrences(sitting_date TEXT,original_question INTEGER,fiscal_year TEXT,canonical_question_id TEXT REFERENCES questions(id),official_answer TEXT,question_url TEXT,answer_url TEXT,PRIMARY KEY(sitting_date,original_question));
      CREATE TABLE study_attempts(id TEXT PRIMARY KEY,question_id TEXT REFERENCES questions(id));
      CREATE TABLE question_review_state(question_id TEXT PRIMARY KEY REFERENCES questions(id),mastered INTEGER);
      INSERT INTO questions(id) VALUES('prior'); INSERT INTO study_attempts VALUES('attempt','prior'); INSERT INTO question_review_state VALUES('prior',1);`)
    const sql = readFileSync(new URL('../migrations/0167_fe_exemption_20210613_network.sql',import.meta.url),'utf8')
    db.exec(sql); db.exec(sql)
    const rows=db.prepare('SELECT o.original_question,o.official_answer,q.answer_json,q.options_json FROM fe_exemption_occurrences o JOIN questions q ON q.id=o.canonical_question_id ORDER BY o.sitting_date,o.original_question').all()
    assert.deepEqual(rows.map(r=>[r.original_question,r.official_answer]),[[31,'c'],[32,'d'],[33,'b'],[34,'b'],[35,'a'],[36,'c'],[37,'c'],[38,'b'],[39,'d'],[40,'c']])
    for(const r of rows) { assert.equal(JSON.parse(r.answer_json),r.official_answer);assert.equal(JSON.parse(r.options_json).length,4) }
    assert.equal(db.prepare('SELECT COUNT(*) n FROM study_attempts').get().n,1)
    assert.equal(db.prepare('SELECT mastered FROM question_review_state').get().mastered,1)
    assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(),[])
  } finally { db.close() }
})

test('subnet mask excludes the broadcast address',()=>{ const network=16, mask=240; assert.equal(network&mask,16);assert.equal(network | (255 ^ mask),31);assert.ok(30<31) })
