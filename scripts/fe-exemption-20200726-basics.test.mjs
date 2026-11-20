import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {DatabaseSync} from 'node:sqlite'

test('2020 July basics batch preserves official keys and history',()=>{
 const db=new DatabaseSync(':memory:')
 try{
  db.exec(`PRAGMA foreign_keys=ON;
   CREATE TABLE questions(id TEXT PRIMARY KEY,track_id TEXT,topic TEXT,difficulty TEXT,question_type TEXT,prompt TEXT,options_json TEXT,answer_json TEXT,explanation TEXT,source_type TEXT,source_reference TEXT,language TEXT,exam_section TEXT,exam_section_method TEXT,question_kind TEXT,exam_origin TEXT);
   CREATE TABLE fe_exemption_occurrences(sitting_date TEXT,original_question INTEGER,fiscal_year TEXT,canonical_question_id TEXT REFERENCES questions(id),official_answer TEXT,question_url TEXT,answer_url TEXT,PRIMARY KEY(sitting_date,original_question));
   CREATE TABLE study_attempts(id TEXT PRIMARY KEY,question_id TEXT REFERENCES questions(id));
   INSERT INTO questions(id,answer_json) VALUES ('existing','"a"'),('fe-ipa-official-2024-a-06','"a"'),('fe-ipa-2019-spring-am-adapt-29','"c"'),('fe-ipa-official-2019-spring-a-01','"c"'),('fe-ipa-2019-spring-am-adapt-10','"b"'),('fe-ipa-2019-spring-am-adapt-58','"a"'); INSERT INTO study_attempts VALUES('keep','existing');`)
  const sql=readFileSync(new URL('../migrations/0203_fe_exemption_20200726_basics.sql',import.meta.url),'utf8');db.exec(sql);db.exec(sql)
  const rows=db.prepare('SELECT o.*,q.answer_json,q.options_json,q.explanation,q.exam_section FROM fe_exemption_occurrences o JOIN questions q ON q.id=o.canonical_question_id ORDER BY original_question').all()
  const answers=new Map([[1,'c'],[3,'d'],[4,'a'],[5,'b'],[6,'b'],[7,'c'],[8,'b'],[9,'b'],[10,'c'],[11,'c'],[13,'b'],[14,'a'],[15,'a'],[16,'b'],[17,'d'],[18,'a'],[19,'b'],[21,'b'],[22,'b'],[23,'a'],[24,'a'],[25,'d'],[26,'a'],[27,'b'],[28,'c'],[29,'c'],[30,'b'],[31,'a'],[35,'a'],[37,'a'],[40,'b'],[41,'b'],[42,'d'],[44,'d'],[45,'b'],[46,'c'],[48,'b'],[50,'c'],[51,'c'],[54,'d'],[55,'b'],[56,'a'],[57,'b'],[58,'a'],[59,'c'],[60,'d'],[61,'a'],[62,'c'],[63,'a'],[64,'d'],[65,'a'],[66,'d'],[68,'b'],[69,'a'],[70,'a'],[72,'b'],[73,'b'],[75,'b'],[77,'b'],[78,'c'],[79,'b'],[80,'d']]);assert.equal(rows.length,answers.size)
  for(const row of rows){assert.equal(row.official_answer,answers.get(row.original_question));assert.equal(JSON.parse(row.answer_json),row.official_answer);if (![1,13,24,28,58].includes(row.original_question)) { assert.equal(JSON.parse(row.options_json).length,4);assert.match(row.explanation,/中文：/) };if (![1,13,24,28,58].includes(row.original_question)) assert.equal(row.exam_section,'A')}
  assert.equal(db.prepare('SELECT COUNT(*) n FROM questions').get().n,63);assert.equal(db.prepare('SELECT COUNT(*) n FROM study_attempts').get().n,1);assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(),[])
 } finally{db.close()}
})
test('calculation checks',()=>{ assert.equal(7/32,0b00111/32); assert.equal(6*10,60); assert.ok(2**-10<.001 && 2**-9>=.001); assert.equal(5+19,24); assert.equal(10+.1*80,18) })
