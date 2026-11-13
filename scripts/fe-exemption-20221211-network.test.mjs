import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {DatabaseSync} from 'node:sqlite'

test('IPA December 2022 interface, database and network questions import idempotently with official answers', () => {
 const db = new DatabaseSync(':memory:')
 try {
  db.exec(`PRAGMA foreign_keys=ON;
   CREATE TABLE questions(id TEXT PRIMARY KEY,track_id TEXT,topic TEXT,difficulty TEXT,question_type TEXT,prompt TEXT,options_json TEXT,answer_json TEXT,explanation TEXT,source_type TEXT,source_reference TEXT,language TEXT,exam_section TEXT,exam_section_method TEXT,question_kind TEXT,exam_origin TEXT);
   CREATE TABLE fe_exemption_occurrences(sitting_date TEXT,original_question INTEGER,fiscal_year TEXT,canonical_question_id TEXT REFERENCES questions(id),official_answer TEXT,question_url TEXT,answer_url TEXT,PRIMARY KEY(sitting_date,original_question));
   CREATE TABLE study_attempts(id TEXT PRIMARY KEY,question_id TEXT REFERENCES questions(id));
   INSERT INTO questions(id) VALUES('prior'); INSERT INTO study_attempts VALUES('saved','prior');`)
  const sql=readFileSync(new URL('../migrations/0173_fe_exemption_20221211_network.sql',import.meta.url),'utf8')
  db.exec(sql); db.exec(sql)
  const actual=db.prepare('SELECT o.original_question,o.official_answer,q.answer_json,q.options_json,q.explanation FROM fe_exemption_occurrences o JOIN questions q ON q.id=o.canonical_question_id ORDER BY o.original_question').all()
  const expected=new Map([[23,'b'],[24,'b'],[25,'d'],[28,'a'],[29,'b'],[30,'a'],[31,'a'],[32,'b'],[33,'c'],[34,'b'],[35,'a'],[36,'c'],[37,'d'],[39,'d'],[40,'d'],[42,'c']])
  assert.equal(actual.length,expected.size)
  for(const row of actual) {
   assert.equal(row.official_answer,expected.get(row.original_question)); assert.equal(JSON.parse(row.answer_json),row.official_answer)
   assert.deepEqual(JSON.parse(row.options_json).map(o=>o.id),['a','b','c','d']); assert.match(row.explanation,/中文/)
  }
  assert.equal(db.prepare('SELECT COUNT(*) n FROM study_attempts').get().n,1)
  assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(),[])
 } finally {db.close()}
})
