import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {DatabaseSync} from 'node:sqlite'

test('2021 December basics batch preserves official keys and history',()=>{
 const db=new DatabaseSync(':memory:')
 try{
  db.exec(`PRAGMA foreign_keys=ON;
   CREATE TABLE questions(id TEXT PRIMARY KEY,track_id TEXT,topic TEXT,difficulty TEXT,question_type TEXT,prompt TEXT,options_json TEXT,answer_json TEXT,explanation TEXT,source_type TEXT,source_reference TEXT,language TEXT,exam_section TEXT,exam_section_method TEXT,question_kind TEXT,exam_origin TEXT);
   CREATE TABLE fe_exemption_occurrences(sitting_date TEXT,original_question INTEGER,fiscal_year TEXT,canonical_question_id TEXT REFERENCES questions(id),official_answer TEXT,question_url TEXT,answer_url TEXT,PRIMARY KEY(sitting_date,original_question));
   CREATE TABLE study_attempts(id TEXT PRIMARY KEY,question_id TEXT REFERENCES questions(id));
   INSERT INTO questions(id,answer_json) VALUES ('existing','"a"'),('fe-exempt-2020-20200726-q09','"b"'),('fe-exempt-2020-20200614-q24','"d"'),('fe-exempt-2020-20200614-q27','"d"'),('fe-ipa-sample-2022-a-029','"a"'),('fe-exempt-2020-20200726-q40','"b"'),('fe-exempt-2020-20200726-q41','"b"'),('fe-ipa-2019-spring-am-adapt-37','"c"'),('fe-ipa-official-2023-a-11','"d"'),('fe-exempt-2020-20200726-q51','"c"'),('fe-ipa-2019-spring-am-adapt-54','"b"'),('fe-exempt-2020-20200726-q55','"b"'),('fe-exempt-2020-20200726-q56','"a"'),('fe-ipa-2019-spring-am-adapt-61','"b"'),('fe-exempt-2020-20200726-q65','"a"'),('fe-exempt-2020-20200614-q69','"a"'),('fe-exempt-2020-20200614-q72','"c"'),('fe-exempt-2020-20200614-q74','"b"'),('fe-exempt-2020-20200726-q73','"b"'),('fe-ipa-official-2023-a-20','"a"'); INSERT INTO study_attempts VALUES('keep','existing');`)
  const sql=readFileSync(new URL('../migrations/0204_fe_exemption_20211212_basics.sql',import.meta.url),'utf8');db.exec(sql);db.exec(sql)
  const rows=db.prepare('SELECT o.*,q.answer_json,q.options_json,q.explanation,q.exam_section FROM fe_exemption_occurrences o JOIN questions q ON q.id=o.canonical_question_id ORDER BY original_question').all()
  const answers=new Map([[1,'a'],[2,'c'],[3,'a'],[4,'b'],[5,'a'],[6,'c'],[7,'b'],[8,'b'],[9,'c'],[10,'b'],[11,'d'],[12,'c'],[13,'a'],[14,'b'],[15,'a'],[16,'c'],[17,'d'],[18,'d'],[19,'b'],[20,'c'],[21,'d'],[22,'a'],[23,'c'],[24,'d'],[25,'d'],[26,'b'],[27,'c'],[28,'a'],[29,'d'],[30,'b'],[31,'a'],[32,'c'],[33,'c'],[34,'a'],[35,'c'],[36,'a'],[37,'a'],[38,'b'],[39,'a'],[40,'c'],[41,'b'],[42,'b'],[43,'a'],[44,'d'],[45,'c'],[46,'b'],[47,'d'],[48,'c'],[49,'a'],[50,'d'],[51,'c'],[52,'a'],[53,'c'],[54,'b'],[55,'c'],[56,'b'],[57,'a'],[58,'d'],[59,'c'],[60,'b'],[61,'d'],[62,'b'],[63,'c'],[64,'a'],[65,'b'],[66,'c'],[67,'d'],[68,'c'],[69,'a'],[70,'c'],[71,'a'],[72,'d'],[73,'b'],[74,'b'],[75,'b'],[76,'a'],[77,'d'],[78,'b'],[79,'a'],[80,'a']]);assert.equal(rows.length,answers.size)
  for(const row of rows){assert.equal(row.official_answer,answers.get(row.original_question));assert.equal(JSON.parse(row.answer_json),row.official_answer);if(![8,24,25,34,40,41,42,47,51,54,56,57,62,64,69,70,73,74,79].includes(row.original_question)){assert.equal(JSON.parse(row.options_json).length,4);assert.match(row.explanation,/中文：/);assert.equal(row.exam_section,'A')}}
  assert.equal(db.prepare('SELECT COUNT(*) n FROM questions').get().n,81);assert.equal(db.prepare('SELECT COUNT(*) n FROM study_attempts').get().n,1);assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(),[])
 } finally{db.close()}
})
test('math checks',()=>{assert.equal((1+2+3+4)/6,5/3);assert.ok(Math.abs(.5+2*.3+3*.2-1.7)<1e-12);assert.equal(1024*768*3,2359296);assert.ok(Math.abs((45/50)**2-.81)<1e-12)})
