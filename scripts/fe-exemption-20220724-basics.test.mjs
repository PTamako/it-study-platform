import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {DatabaseSync} from 'node:sqlite'
test('2022 July reviewed questions retain answers, duplicates and history',()=>{
 const db=new DatabaseSync(':memory:')
 try{
  db.exec(`PRAGMA foreign_keys=ON;
   CREATE TABLE questions(id TEXT PRIMARY KEY,track_id TEXT,topic TEXT,difficulty TEXT,question_type TEXT,prompt TEXT,options_json TEXT,answer_json TEXT,explanation TEXT,source_type TEXT,source_reference TEXT,language TEXT,exam_section TEXT,exam_section_method TEXT,question_kind TEXT,exam_origin TEXT);
   CREATE TABLE fe_exemption_occurrences(sitting_date TEXT,original_question INTEGER,fiscal_year TEXT,canonical_question_id TEXT REFERENCES questions(id),official_answer TEXT,question_url TEXT,answer_url TEXT,PRIMARY KEY(sitting_date,original_question));
   CREATE TABLE study_attempts(id TEXT PRIMARY KEY,question_id TEXT REFERENCES questions(id));
   INSERT INTO questions(id,answer_json) VALUES ('fe-ipa-official-2023-a-02','"c"'),('fe-ipa-official-2024-a-06','"a"'),('fe-ipa-2019-spring-am-adapt-26','"b"'),('fe-exempt-2020-20200726-q29','"c"'),('fe-exempt-2020-20201213-q31','"a"'),('fe-exempt-2020-20201213-q32','"b"'),('fe-exempt-2020-20200614-q36','"d"'),('fe-ipa-sample-2022-a-020','"d"'),('fe-exempt-2020-20201213-q25','"d"'),('fe-exempt-2020-20200614-q31','"a"'),('fe-ipa-official-2025-a-10','"a"');
   INSERT INTO study_attempts VALUES('keep','fe-ipa-official-2023-a-02');`)
  const sql=readFileSync(new URL('../migrations/0206_fe_exemption_20220724_basics.sql',import.meta.url),'utf8');db.exec(sql);db.exec(sql)
  const rows=db.prepare('SELECT o.*,q.answer_json,q.options_json,q.explanation FROM fe_exemption_occurrences o JOIN questions q ON q.id=o.canonical_question_id ORDER BY original_question').all()
  const answers=new Map([[1,'c'],[2,'d'],[3,'c'],[4,'c'],[5,'b'],[6,'c'],[7,'b'],[8,'c'],[9,'a'],[11,'c'],[12,'b'],[13,'d'],[14,'d'],[16,'d'],[17,'c'],[18,'b'],[19,'c'],[20,'c'],[21,'b'],[23,'d'],[24,'a'],[25,'d'],[26,'b'],[27,'c'],[28,'d'],[29,'c'],[30,'a'],[31,'a'],[32,'b'],[33,'d'],[34,'d'],[35,'d'],[36,'d'],[37,'d'],[38,'d'],[39,'a'],[40,'c'],[41,'b'],[42,'a'],[46,'a'],[47,'c'],[48,'b'],[53,'d']]);assert.equal(rows.length,answers.size)
  for(const row of rows){assert.equal(row.official_answer,answers.get(row.original_question));assert.equal(JSON.parse(row.answer_json),row.official_answer);if(![8,24,26,29,30,32,35,23,25,31,42].includes(row.original_question)){assert.equal(JSON.parse(row.options_json).length,4);assert.match(row.explanation,/中文：/)}}
  assert.equal(db.prepare('SELECT COUNT(*) n FROM study_attempts').get().n,1);assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(),[])
 }finally{db.close()}
})
test('calculations and LRU simulation',()=>{assert.equal(40000*16/8/1000,80);assert.equal(1/(.5*10+.3*40+.2*40)*1000,40);assert.equal(8*(1+Math.ceil(9000/4000)),32);const f=[1,2,3,4], last=new Map(f.map((v,i)=>[v,i]));for(const [i,n] of [2,5,3,1,6,5,4].entries()){if(!f.includes(n)){const k=f.reduce((a,v,j)=>last.get(v)<last.get(f[a])?j:a,0);f[k]=n}last.set(n,i+4)}assert.equal(f[2],4)})
