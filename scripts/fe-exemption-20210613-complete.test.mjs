import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'

test('the June 2021 paper resolves all 80 positions with compatible answers and existing history',()=>{
 const db=new DatabaseSync(':memory:')
 try {
  db.exec(`PRAGMA foreign_keys=ON;
   CREATE TABLE questions(id TEXT PRIMARY KEY,track_id TEXT,topic TEXT,difficulty TEXT,question_type TEXT,prompt TEXT,options_json TEXT,answer_json TEXT,explanation TEXT,source_type TEXT,source_reference TEXT,language TEXT,exam_section TEXT,exam_section_method TEXT,question_kind TEXT,exam_origin TEXT);
   CREATE TABLE fe_exemption_occurrences(sitting_date TEXT,original_question INTEGER,fiscal_year TEXT,canonical_question_id TEXT REFERENCES questions(id),official_answer TEXT,question_url TEXT,answer_url TEXT,PRIMARY KEY(sitting_date,original_question));
   CREATE TABLE study_attempts(id TEXT PRIMARY KEY,question_id TEXT REFERENCES questions(id));
   CREATE TABLE question_review_state(question_id TEXT PRIMARY KEY REFERENCES questions(id),mastered INTEGER);`)
  const question=db.prepare('INSERT INTO questions(id,answer_json) VALUES (?,?)')
  const occurrence=db.prepare('INSERT INTO fe_exemption_occurrences VALUES(?,?,?,?,?,?,?)')
  const input=JSON.parse(readFileSync(new URL('./data/fe-exemption-official-first23.json',import.meta.url),'utf8'))
  for(const row of input.items.filter(r=>r.sitting_date==='2021-06-13')){
   const answer='abcd'[row.answer];question.run(row.id,JSON.stringify(answer));occurrence.run(row.sitting_date,row.original_question,row.fiscal_year,row.id,answer,row.source_url,row.answer_url)
  }
  for(const [id,a] of [['fe-ipa-sample-2022-a-004','a'],['fe-exempt-2020-20201213-q28','d'],['fe-ipa-2019-spring-am-adapt-50','a'],['fe-ipa-2019-spring-am-adapt-28','b'],['fe-ipa-2019-spring-am-adapt-44','c'],['fe-ipa-2019-spring-am-adapt-62','d'],['fe-ipa-official-2024-a-11','c']]) question.run(id,JSON.stringify(a))
  db.exec("INSERT INTO study_attempts VALUES('attempt','fe-ipa-2019-spring-am-adapt-44'); INSERT INTO question_review_state VALUES('fe-ipa-2019-spring-am-adapt-44',1)")
  for(const name of ['0162_fe_exemption_shared_2021_2022.sql','0163_fe_exemption_20210613_systems.sql','0164_fe_exemption_repeats_2021_2022.sql','0165_fe_exemption_20210613_development.sql','0166_fe_exemption_20210613_database.sql','0167_fe_exemption_20210613_network.sql','0168_fe_exemption_20210613_management.sql','0169_fe_exemption_20210613_strategy.sql']){
   const sql=readFileSync(new URL(`../migrations/${name}`,import.meta.url),'utf8');db.exec(sql);db.exec(sql)
  }
  const rows=db.prepare("SELECT o.original_question,o.official_answer,q.answer_json FROM fe_exemption_occurrences o JOIN questions q ON q.id=o.canonical_question_id WHERE o.sitting_date='2021-06-13' ORDER BY o.original_question").all()
  assert.deepEqual(rows.map(r=>r.original_question),Array.from({length:80},(_,i)=>i+1))
  // Independently cross-checked against a second answer source: the IPA answer PDF has missing glyphs.\n  const independentlyReviewed='aadcadcbbbdbcaadcdcbccaabbdabdcdbbaccbdccabcdccbdbdccbcabdadccdaccbcaaccbccbccda'.split('')\n  assert.deepEqual(rows.map(r=>r.official_answer),independentlyReviewed)\n  for(const row of rows) assert.equal(JSON.parse(row.answer_json),row.official_answer,`Q${row.original_question}`)
  assert.equal(db.prepare('SELECT COUNT(*) n FROM study_attempts').get().n,1)
  assert.equal(db.prepare('SELECT mastered FROM question_review_state').get().mastered,1)
  assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(),[])
 } finally { db.close() }
})
