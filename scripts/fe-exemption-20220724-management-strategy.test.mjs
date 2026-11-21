import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {DatabaseSync} from 'node:sqlite'
test('July 2022 management and strategy answers and idempotency',()=>{
 const db=new DatabaseSync(':memory:')
 try {
  db.exec(`PRAGMA foreign_keys=ON;
   CREATE TABLE questions(id TEXT PRIMARY KEY,track_id TEXT,topic TEXT,difficulty TEXT,question_type TEXT,prompt TEXT,options_json TEXT,answer_json TEXT,explanation TEXT,source_type TEXT,source_reference TEXT,language TEXT,exam_section TEXT,exam_section_method TEXT,question_kind TEXT,exam_origin TEXT);
   CREATE TABLE fe_exemption_occurrences(sitting_date TEXT,original_question INTEGER,fiscal_year TEXT,canonical_question_id TEXT REFERENCES questions(id),official_answer TEXT,question_url TEXT,answer_url TEXT,PRIMARY KEY(sitting_date,original_question));
   CREATE TABLE study_attempts(id TEXT PRIMARY KEY,question_id TEXT REFERENCES questions(id));
   INSERT INTO questions(id,answer_json) VALUES ('old','"a"'),('fe-ipa-2019-spring-am-adapt-59','"d"'),('fe-exempt-2020-20200614-q73','"d"'); INSERT INTO study_attempts VALUES('keep','old');`)
  const sql=readFileSync(new URL('../migrations/0207_fe_exemption_20220724_management_strategy.sql',import.meta.url),'utf8');db.exec(sql);db.exec(sql)
  const expected=new Map([[58,'b'],[59,'d'],[63,'b'],[64,'c'],[68,'c'],[69,'c'],[70,'b'],[71,'c'],[72,'d'],[73,'d'],[74,'d']])
  const rows=db.prepare('SELECT o.original_question,o.official_answer,q.answer_json,q.options_json,q.explanation FROM fe_exemption_occurrences o JOIN questions q ON q.id=o.canonical_question_id').all()
  assert.equal(rows.length,expected.size)
  for(const r of rows){assert.equal(r.official_answer,expected.get(r.original_question));assert.equal(JSON.parse(r.answer_json),r.official_answer);if (![59,72].includes(r.original_question)) {assert.equal(JSON.parse(r.options_json).length,4);assert.match(r.explanation,/中文：/)}}
  assert.equal(db.prepare('SELECT COUNT(*) n FROM study_attempts').get().n,1);assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(),[])
 } finally{db.close()}
})
test('total ownership cost and planned output calculations',()=>{assert.equal(40000+50000+5000+3*(1500+7000+5000),135500);assert.equal(4800+300-250,4850)})
