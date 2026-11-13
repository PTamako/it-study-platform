import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {DatabaseSync} from 'node:sqlite'

test('December 2022 basics and July 2020 repetitions import safely and match official keys',()=>{
 const db=new DatabaseSync(':memory:')
 try{
  db.exec(`PRAGMA foreign_keys=ON;
   CREATE TABLE questions(id TEXT PRIMARY KEY,track_id TEXT,topic TEXT,difficulty TEXT,question_type TEXT,prompt TEXT,options_json TEXT,answer_json TEXT,explanation TEXT,source_type TEXT,source_reference TEXT,language TEXT,exam_section TEXT,exam_section_method TEXT,question_kind TEXT,exam_origin TEXT);
   CREATE TABLE fe_exemption_occurrences(sitting_date TEXT,original_question INTEGER,fiscal_year TEXT,canonical_question_id TEXT REFERENCES questions(id),official_answer TEXT,question_url TEXT,answer_url TEXT,PRIMARY KEY(sitting_date,original_question));
   CREATE TABLE study_attempts(id TEXT PRIMARY KEY,question_id TEXT REFERENCES questions(id)); CREATE TABLE question_review_state(question_id TEXT PRIMARY KEY REFERENCES questions(id),mastered INTEGER);
   INSERT INTO questions(id) VALUES('prior'); INSERT INTO study_attempts VALUES('attempt','prior'); INSERT INTO question_review_state VALUES('prior',1);`)
  const sql=readFileSync(new URL('../migrations/0171_fe_exemption_20221211_basics.sql',import.meta.url),'utf8');db.exec(sql);db.exec(sql)
  const rows=db.prepare('SELECT o.*,q.answer_json FROM fe_exemption_occurrences o JOIN questions q ON q.id=o.canonical_question_id ORDER BY sitting_date,original_question').all()
  assert.equal(rows.length,16);assert.equal(new Set(rows.map(r=>r.canonical_question_id)).size,13)
  assert.deepEqual(rows.filter(r=>r.sitting_date==='2022-12-11').map(r=>r.official_answer),'a b d c c b b c c c a c c'.split(' '))
  for(const r of rows)assert.equal(JSON.parse(r.answer_json),r.official_answer)
  assert.equal(db.prepare('SELECT COUNT(*) n FROM study_attempts').get().n,1);assert.equal(db.prepare('SELECT mastered FROM question_review_state').get().mastered,1)
  assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(),[])
 }finally{db.close()}
})
test('probability, parity, tree and CPU calculations follow the source',()=>{
 assert.ok(Math.abs(.3*.4+.5*.3+.2*.3-.33)<1e-12)
 assert.equal(2*(1000/100)**3/4,500)
 assert.equal([0x30,0x3f,0x7a].map(x=>x.toString(2).replaceAll('0','').length%2 ? x|0x80:x).join(','),[0x30,0x3f,0xfa].join(','))
 const edges=[[1,2],[1,5],[2,3],[2,4]],seen=new Set([1]);for(let pass=0;pass<5;pass++)for(const [u,v] of edges){if(seen.has(u))seen.add(v);if(seen.has(v))seen.add(u)}
 assert.equal(seen.size,5);assert.equal(edges.length,seen.size-1);assert.equal((1*4)/(4*.5),2)
})
