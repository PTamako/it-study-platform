import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {DatabaseSync} from 'node:sqlite'

test('2021 July Q45–62: official keys, repeat links, idempotency and history',()=>{
 const db=new DatabaseSync(':memory:')
 try {
  db.exec(`PRAGMA foreign_keys=ON;
   CREATE TABLE questions(id TEXT PRIMARY KEY,track_id TEXT,topic TEXT,difficulty TEXT,question_type TEXT,prompt TEXT,options_json TEXT,answer_json TEXT,explanation TEXT,source_type TEXT,source_reference TEXT,language TEXT,exam_section TEXT,exam_section_method TEXT,question_kind TEXT,exam_origin TEXT);
   CREATE TABLE fe_exemption_occurrences(sitting_date TEXT,original_question INTEGER,fiscal_year TEXT,canonical_question_id TEXT REFERENCES questions(id),official_answer TEXT,question_url TEXT,answer_url TEXT,PRIMARY KEY(sitting_date,original_question));
   CREATE TABLE study_attempts(id TEXT PRIMARY KEY,question_id TEXT REFERENCES questions(id));`)
  const repeats=[[48,'fe-exempt-2022-20221211-q48','d'],[51,'fe-exempt-2022-20221211-q52','d'],[53,'fe-exempt-2022-20221211-q54','a'],[55,'fe-ipa-2019-spring-am-adapt-56','a'],[56,'fe-ipa-official-2024-a-14','c']]
  for(const [,id,key] of repeats) db.prepare('INSERT INTO questions(id,answer_json) VALUES (?,?)').run(id,JSON.stringify(key))
  db.exec("INSERT INTO study_attempts VALUES('keep','fe-ipa-2019-spring-am-adapt-56')")
  const sql=readFileSync(new URL('../migrations/0201_fe_exemption_20210725_management.sql',import.meta.url),'utf8');db.exec(sql);db.exec(sql)
  const rows=db.prepare('SELECT o.*,q.answer_json,q.options_json,q.explanation FROM fe_exemption_occurrences o JOIN questions q ON q.id=o.canonical_question_id ORDER BY original_question').all()
  const answers='d c b d b d d d a d a c a c c d d a'.split(' ');assert.equal(rows.length,18)
  rows.forEach((row,i)=>{assert.equal(row.original_question,i+45);assert.equal(row.official_answer,answers[i]);assert.equal(JSON.parse(row.answer_json),answers[i]);if(!repeats.some(([n])=>n===row.original_question)){assert.equal(JSON.parse(row.options_json).length,4);assert.match(row.explanation,/中文：/)}})
  for(const [n,id] of repeats)assert.equal(rows[n-45].canonical_question_id,id)
  assert.equal(db.prepare('SELECT COUNT(*) n FROM questions').get().n,18);assert.equal(db.prepare('SELECT COUNT(*) n FROM study_attempts').get().n,1);assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(),[])
 }finally{db.close()}
})
test('project paths, staffing and payback',()=>{
 const duration=(a,b,c,d,e,f)=>Math.max(a+d,b+c+d,b+e+f)
 assert.equal(duration(6,3,4,2,4,1),9);assert.equal(duration(6,2,4,1,4,1),7)
 assert.deepEqual([.16,.33,.42,.09].map((v,i)=>200*v/(10*[.2,.3,.4,.1][i])),[16,22,21,18])
 assert.equal((300/5)/(90/3),2)
})
