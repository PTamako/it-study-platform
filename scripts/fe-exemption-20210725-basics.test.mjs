import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {DatabaseSync} from 'node:sqlite'

test('2021 July 1–24: official keys, duplicate links and safe repeated migration',()=>{
 const db=new DatabaseSync(':memory:')
 try{
  db.exec(`PRAGMA foreign_keys=ON;
   CREATE TABLE questions(id TEXT PRIMARY KEY,track_id TEXT,topic TEXT,difficulty TEXT,question_type TEXT,prompt TEXT,options_json TEXT,answer_json TEXT,explanation TEXT,source_type TEXT,source_reference TEXT,language TEXT,exam_section TEXT,exam_section_method TEXT,question_kind TEXT,exam_origin TEXT);
   CREATE TABLE fe_exemption_occurrences(sitting_date TEXT,original_question INTEGER,fiscal_year TEXT,canonical_question_id TEXT REFERENCES questions(id),official_answer TEXT,question_url TEXT,answer_url TEXT,PRIMARY KEY(sitting_date,original_question));
   CREATE TABLE study_attempts(id TEXT PRIMARY KEY,question_id TEXT REFERENCES questions(id));`)
  const repeats=[[2,'fe-ipa-official-2019-spring-a-03','d'],[3,'fe-exempt-2022-20221211-q02','b'],[5,'fe-exempt-2022-20221211-q04','c'],[7,'fe-ipa-sample-2022-a-005','b'],[8,'fe-ipa-official-2019-spring-a-06','a']]
  const seed=db.prepare('INSERT INTO questions(id,answer_json) VALUES (?,?)');for(const [,id,key] of repeats)seed.run(id,JSON.stringify(key))
  db.exec("INSERT INTO study_attempts VALUES('keep','fe-ipa-official-2019-spring-a-03')")
  const sql=readFileSync(new URL('../migrations/0199_fe_exemption_20210725_basics.sql',import.meta.url),'utf8');db.exec(sql);db.exec(sql)
  const rows=db.prepare('SELECT o.*,q.answer_json,q.options_json,q.explanation FROM fe_exemption_occurrences o JOIN questions q ON q.id=o.canonical_question_id ORDER BY original_question').all()
  const answers='c d b d c a b a a c d b d a d d d a a c d c c c'.split(' ')
  assert.equal(rows.length,22)
  for(const row of rows){assert.equal(row.official_answer,answers[row.original_question-1]);assert.equal(JSON.parse(row.answer_json),row.official_answer);if(!repeats.some(([n])=>n===row.original_question)){assert.equal(JSON.parse(row.options_json).length,4);assert.match(row.explanation,/中文：/)}}
  for(const [n,id] of repeats) assert.equal(rows.find(row=>row.original_question===n).canonical_question_id,id)
  assert.equal(db.prepare('SELECT COUNT(*) n FROM study_attempts').get().n,1);assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(),[])
 } finally{db.close()}
})
test('independently evaluate calculations and Boolean circuit',()=>{
 for(let a=1;a<256;a++)assert.equal(a & (a^(a-1)),a & -a)
 assert.equal(.6*.02/(.6*.02+.4*.01),.75)
 assert.equal(700/(4*.3+8*.6+10*.1),100)
 assert.ok(Math.abs((.95-.9)/(.1*.8)-.625)<1e-12)
 assert.equal(44100*2*3600,317520000)
 for(let n=0;n<16;n++){let a=(n>>3)&1,b=(n>>2)&1,c=(n>>1)&1,d=n&1;assert.equal(1-((1-(a&b))&(1-(c&d))),(a&b)|(c&d))}
})
