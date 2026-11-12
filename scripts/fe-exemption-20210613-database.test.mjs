import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'

test('2021 database and coding questions import idempotently without changing existing study state', () => {
  const db = new DatabaseSync(':memory:')
  try {
    db.exec(`PRAGMA foreign_keys=ON;
      CREATE TABLE questions(id TEXT PRIMARY KEY,track_id TEXT,topic TEXT,difficulty TEXT,question_type TEXT,prompt TEXT,options_json TEXT,answer_json TEXT,explanation TEXT,source_type TEXT,source_reference TEXT,language TEXT,exam_section TEXT,exam_section_method TEXT,question_kind TEXT,exam_origin TEXT);
      CREATE TABLE fe_exemption_occurrences(sitting_date TEXT,original_question INTEGER,fiscal_year TEXT,canonical_question_id TEXT REFERENCES questions(id),official_answer TEXT,question_url TEXT,answer_url TEXT,PRIMARY KEY(sitting_date,original_question));
      CREATE TABLE study_attempts(id TEXT PRIMARY KEY,question_id TEXT REFERENCES questions(id));
      CREATE TABLE question_review_state(question_id TEXT PRIMARY KEY REFERENCES questions(id),mastered INTEGER);
      INSERT INTO questions(id) VALUES('prior'); INSERT INTO study_attempts VALUES('attempt','prior'); INSERT INTO question_review_state VALUES('prior',1);`)
    const sql = readFileSync(new URL('../migrations/0166_fe_exemption_20210613_database.sql',import.meta.url),'utf8')
    db.exec(sql); db.exec(sql)
    const rows=db.prepare('SELECT o.original_question,o.official_answer,q.answer_json,q.options_json FROM fe_exemption_occurrences o JOIN questions q ON q.id=o.canonical_question_id ORDER BY o.sitting_date,o.original_question').all()
    assert.deepEqual(rows.map(r=>[r.original_question,r.official_answer]),[[23,'a'],[24,'a'],[26,'b'],[27,'d'],[28,'a'],[29,'b'],[30,'d']])
    for(const r of rows) { assert.equal(JSON.parse(r.answer_json),r.official_answer);assert.equal(JSON.parse(r.options_json).length,4) }
    assert.equal(db.prepare('SELECT COUNT(*) n FROM study_attempts').get().n,1)
    assert.equal(db.prepare('SELECT mastered FROM question_review_state').get().mastered,1)
    assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(),[])
  } finally { db.close() }
})

test('code capacity and transfer duration match the source quantities',()=>{ assert.equal(8000 * 6 ** 3 / 5 ** 3,13824); assert.ok(26 ** 2 < 13824 && 26 ** 3 >= 13824); assert.equal(10 * 10 ** 6 * 8 / (100000 * 0.5),1600) })
