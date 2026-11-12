import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {DatabaseSync} from 'node:sqlite'

test('December 2022 systems and July 2021 repetitions import safely and match official keys',()=>{
 const db=new DatabaseSync(':memory:')
 try{
  db.exec(`PRAGMA foreign_keys=ON;
   CREATE TABLE questions(id TEXT PRIMARY KEY,track_id TEXT,topic TEXT,difficulty TEXT,question_type TEXT,prompt TEXT,options_json TEXT,answer_json TEXT,explanation TEXT,source_type TEXT,source_reference TEXT,language TEXT,exam_section TEXT,exam_section_method TEXT,question_kind TEXT,exam_origin TEXT);
   CREATE TABLE fe_exemption_occurrences(sitting_date TEXT,original_question INTEGER,fiscal_year TEXT,canonical_question_id TEXT REFERENCES questions(id),official_answer TEXT,question_url TEXT,answer_url TEXT,PRIMARY KEY(sitting_date,original_question));
   CREATE TABLE study_attempts(id TEXT PRIMARY KEY,question_id TEXT REFERENCES questions(id)); CREATE TABLE question_review_state(question_id TEXT PRIMARY KEY REFERENCES questions(id),mastered INTEGER);
   INSERT INTO questions(id) VALUES('prior'); INSERT INTO study_attempts VALUES('attempt','prior'); INSERT INTO question_review_state VALUES('prior',1);`)
  const sql=readFileSync(new URL('../migrations/0172_fe_exemption_20221211_systems.sql',import.meta.url),'utf8');db.exec(sql);db.exec(sql)
  const rows=db.prepare('SELECT o.*,q.answer_json FROM fe_exemption_occurrences o JOIN questions q ON q.id=o.canonical_question_id ORDER BY sitting_date,original_question').all()
  assert.equal(rows.length,8);assert.equal(new Set(rows.map(r=>r.canonical_question_id)).size,6)
  assert.deepEqual(rows.filter(r=>r.sitting_date==='2022-12-11').map(r=>r.official_answer),'b c d b a b'.split(' '))
  for(const r of rows)assert.equal(JSON.parse(r.answer_json),r.official_answer)
  assert.equal(db.prepare('SELECT COUNT(*) n FROM study_attempts').get().n,1);assert.equal(db.prepare('SELECT mastered FROM question_review_state').get().mastered,1)
  assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(),[])
 }finally{db.close()}
})
test('resource redistribution, byte order and execution interleaving match the source',()=>{
 assert.ok(14/16<=.9 && 14/15>.9)
 const bytes=Buffer.alloc(4);bytes.writeUInt32LE(0xABCD1234);assert.equal(bytes.toString('hex'),'3412cdab')
 let x=3,e,f,h,i,g,j;for(const step of ['a1','b1','b2','b3','b4','a2','a3','a4']) switch(step){case 'a1':e=x;break;case 'a2':f=x;break;case 'a3':g=e+f;break;case 'a4':x=g;break;case 'b1':h=x;break;case 'b2':i=x;break;case 'b3':j=h*i;break;case 'b4':x=j;break}assert.equal(x,12)
})
