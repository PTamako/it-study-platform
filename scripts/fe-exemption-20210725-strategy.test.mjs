import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {DatabaseSync} from 'node:sqlite'

test('2021 July Q63–80: official keys, reuse, idempotency and history',()=>{
 const db=new DatabaseSync(':memory:')
 try {
  db.exec(`PRAGMA foreign_keys=ON;
   CREATE TABLE questions(id TEXT PRIMARY KEY,track_id TEXT,topic TEXT,difficulty TEXT,question_type TEXT,prompt TEXT,options_json TEXT,answer_json TEXT,explanation TEXT,source_type TEXT,source_reference TEXT,language TEXT,exam_section TEXT,exam_section_method TEXT,question_kind TEXT,exam_origin TEXT);
   CREATE TABLE fe_exemption_occurrences(sitting_date TEXT,original_question INTEGER,fiscal_year TEXT,canonical_question_id TEXT REFERENCES questions(id),official_answer TEXT,question_url TEXT,answer_url TEXT,PRIMARY KEY(sitting_date,original_question));
   CREATE TABLE study_attempts(id TEXT PRIMARY KEY,question_id TEXT REFERENCES questions(id));`)
  const repeats=[[64,'fe-ipa-sample-2022-a-050','a'],[65,'fe-exempt-2022-20221211-q65','b'],[66,'fe-ipa-sample-2022-a-052','a'],[72,'fe-exempt-2022-20221211-q72','d'],[74,'fe-ipa-2019-spring-am-adapt-73','d']]
  for(const [,id,key] of repeats)db.prepare('INSERT INTO questions(id,answer_json) VALUES (?,?)').run(id,JSON.stringify(key))
  db.exec("INSERT INTO study_attempts VALUES('keep','fe-ipa-sample-2022-a-050')")
  const sql=readFileSync(new URL('../migrations/0202_fe_exemption_20210725_strategy.sql',import.meta.url),'utf8');db.exec(sql);db.exec(sql)
  const rows=db.prepare('SELECT o.*,q.answer_json,q.options_json,q.explanation FROM fe_exemption_occurrences o JOIN questions q ON q.id=o.canonical_question_id ORDER BY original_question').all()
  const answers='b a b a b d c b d d d d b b d b a d'.split(' ');assert.equal(rows.length,18)
  rows.forEach((row,i)=>{assert.equal(row.original_question,i+63);assert.equal(row.official_answer,answers[i]);assert.equal(JSON.parse(row.answer_json),answers[i]);if(!repeats.some(([n])=>n===row.original_question)){assert.equal(JSON.parse(row.options_json).length,4);assert.match(row.explanation,/中文：/)}})
  for(const [n,id] of repeats)assert.equal(rows[n-63].canonical_question_id,id)
  assert.equal(db.prepare('SELECT COUNT(*) n FROM questions').get().n,18);assert.equal(db.prepare('SELECT COUNT(*) n FROM study_attempts').get().n,1);assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(),[])
 }finally{db.close()}
})
test('FIFO cost and inventory adjustment',()=>{
 assert.equal(100*200+30*215,26450)
 for(const [s,e,x] of [[10,30,16],[5,40,12]])assert.equal(x+(e-(x-s)),s+e)
})
