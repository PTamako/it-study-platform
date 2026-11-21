import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {DatabaseSync} from 'node:sqlite'

test('2021 July database and security batch preserves official keys and history',()=>{
 const db=new DatabaseSync(':memory:')
 try{
  db.exec(`PRAGMA foreign_keys=ON;
   CREATE TABLE questions(id TEXT PRIMARY KEY,track_id TEXT,topic TEXT,difficulty TEXT,question_type TEXT,prompt TEXT,options_json TEXT,answer_json TEXT,explanation TEXT,source_type TEXT,source_reference TEXT,language TEXT,exam_section TEXT,exam_section_method TEXT,question_kind TEXT,exam_origin TEXT);
   CREATE TABLE fe_exemption_occurrences(sitting_date TEXT,original_question INTEGER,fiscal_year TEXT,canonical_question_id TEXT REFERENCES questions(id),official_answer TEXT,question_url TEXT,answer_url TEXT,PRIMARY KEY(sitting_date,original_question));
   CREATE TABLE study_attempts(id TEXT PRIMARY KEY,question_id TEXT REFERENCES questions(id));
   INSERT INTO questions(id,answer_json) VALUES ('existing','"a"'); INSERT INTO study_attempts VALUES('keep','existing');`)
  const sql=readFileSync(new URL('../migrations/0200_fe_exemption_20210725_network_security.sql',import.meta.url),'utf8');db.exec(sql);db.exec(sql)
  const rows=db.prepare('SELECT o.*,q.answer_json,q.options_json,q.explanation,q.exam_section FROM fe_exemption_occurrences o JOIN questions q ON q.id=o.canonical_question_id ORDER BY original_question').all()
  const answers=new Map([[25,'b'],[26,'d'],[27,'d'],[28,'a'],[29,'c'],[30,'c'],[32,'c'],[35,'a'],[36,'b'],[38,'c'],[40,'a'],[41,'b'],[42,'b'],[43,'a'],[44,'a']]);assert.equal(rows.length,answers.size)
  for(const row of rows){assert.equal(row.official_answer,answers.get(row.original_question));assert.equal(JSON.parse(row.answer_json),row.official_answer);assert.equal(JSON.parse(row.options_json).length,4);assert.match(row.explanation,/中文：/);assert.equal(row.exam_section,'A')}
  assert.equal(db.prepare('SELECT COUNT(*) n FROM questions').get().n,16);assert.equal(db.prepare('SELECT COUNT(*) n FROM study_attempts').get().n,1);assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(),[])
 } finally{db.close()}
})
test('network transmission calculation is accurate',()=>assert.equal(1000*1000*8/(100_000_000*.5),.16))
