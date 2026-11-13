import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {DatabaseSync} from 'node:sqlite'

test('IPA December 2022 development and management questions preserve official answer positions and study data',()=>{
 const db=new DatabaseSync(':memory:')
 try {
  db.exec(`PRAGMA foreign_keys=ON;
   CREATE TABLE questions(id TEXT PRIMARY KEY,track_id TEXT,topic TEXT,difficulty TEXT,question_type TEXT,prompt TEXT,options_json TEXT,answer_json TEXT,explanation TEXT,source_type TEXT,source_reference TEXT,language TEXT,exam_section TEXT,exam_section_method TEXT,question_kind TEXT,exam_origin TEXT);
   CREATE TABLE fe_exemption_occurrences(sitting_date TEXT,original_question INTEGER,fiscal_year TEXT,canonical_question_id TEXT REFERENCES questions(id),official_answer TEXT,question_url TEXT,answer_url TEXT,PRIMARY KEY(sitting_date,original_question));
   CREATE TABLE study_attempts(id TEXT PRIMARY KEY,question_id TEXT REFERENCES questions(id)); INSERT INTO questions(id) VALUES('prior'); INSERT INTO questions(id,answer_json,options_json,explanation) VALUES('fe-ipa-sample-2022-a-042','"d"','[{"id":"a"},{"id":"b"},{"id":"c"},{"id":"d"}]','中文'); INSERT INTO study_attempts VALUES('saved','prior');`)
  const sql=readFileSync(new URL('../migrations/0174_fe_exemption_20221211_management.sql',import.meta.url),'utf8')
  db.exec(sql); db.exec(sql)
  const rows=db.prepare('SELECT o.original_question,o.official_answer,q.answer_json,q.options_json,q.explanation FROM fe_exemption_occurrences o JOIN questions q ON q.id=o.canonical_question_id ORDER BY o.original_question').all()
  const keys=new Map([[45,'c'],[46,'a'],[47,'b'],[48,'d'],[50,'a'],[51,'d'],[52,'d'],[54,'a'],[57,'d'],[58,'b'],[59,'c'],[60,'c']])
  assert.equal(rows.length,keys.size)
  for(const row of rows){assert.equal(row.official_answer,keys.get(row.original_question));assert.equal(JSON.parse(row.answer_json),row.official_answer);assert.deepEqual(JSON.parse(row.options_json).map(x=>x.id),['a','b','c','d']);assert.match(row.explanation,/中文/)}
  assert.equal(db.prepare('SELECT COUNT(*) n FROM study_attempts').get().n,1);assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(),[])
  assert.equal((1*4+2*5+1*10)*.75,18)
 } finally {db.close()}
})
