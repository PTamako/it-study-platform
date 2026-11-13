import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {DatabaseSync} from 'node:sqlite'

test('June 2020 network/security questions and exact repetitions match the IPA answer table',()=>{
 const db=new DatabaseSync(':memory:')
 try {
  db.exec(`PRAGMA foreign_keys=ON;
   CREATE TABLE questions(id TEXT PRIMARY KEY,track_id TEXT,topic TEXT,difficulty TEXT,question_type TEXT,prompt TEXT,options_json TEXT,answer_json TEXT,explanation TEXT,source_type TEXT,source_reference TEXT,language TEXT,exam_section TEXT,exam_section_method TEXT,question_kind TEXT,exam_origin TEXT);
   CREATE TABLE fe_exemption_occurrences(sitting_date TEXT,original_question INTEGER,fiscal_year TEXT,canonical_question_id TEXT REFERENCES questions(id),official_answer TEXT,question_url TEXT,answer_url TEXT,PRIMARY KEY(sitting_date,original_question));
   CREATE TABLE study_attempts(id TEXT PRIMARY KEY,question_id TEXT REFERENCES questions(id));`)
  const add=db.prepare('INSERT INTO questions(id,answer_json) VALUES(?,?)')
  for(const [id,a] of [['fe-exempt-2022-20221211-q33','c'],['fe-ipa-2019-spring-am-adapt-36','a'],['fe-ipa-sample-2022-a-032','a'],['fe-ipa-2019-spring-am-adapt-42','a'],['fe-ipa-2019-spring-am-adapt-47','b']])add.run(id,JSON.stringify(a))
  db.exec("INSERT INTO study_attempts VALUES('keep','fe-exempt-2022-20221211-q33')")
  const sql=readFileSync(new URL('../migrations/0178_fe_exemption_20200614_security.sql',import.meta.url),'utf8');db.exec(sql);db.exec(sql)
  const rows=db.prepare('SELECT o.original_question,o.official_answer,q.answer_json FROM fe_exemption_occurrences o JOIN questions q ON q.id=o.canonical_question_id ORDER BY o.original_question').all()
  const keys='a c c b a d b b a b a d d b b b'.split(' ')
  assert.equal(rows.length,16)
  rows.forEach((row,i)=>{assert.equal(row.original_question,31+i);assert.equal(row.official_answer,keys[i]);assert.equal(JSON.parse(row.answer_json),keys[i])})
  assert.equal(db.prepare('SELECT COUNT(*) n FROM study_attempts').get().n,1);assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(),[])
 }finally{db.close()}
})
