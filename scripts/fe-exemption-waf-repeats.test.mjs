import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {DatabaseSync} from 'node:sqlite'

test('WAF occurrences with differing distractors remain distinct while exact repeats share progress',()=>{
 const db=new DatabaseSync(':memory:')
 try{
  db.exec(`PRAGMA foreign_keys=ON;
   CREATE TABLE questions(id TEXT PRIMARY KEY,track_id TEXT,topic TEXT,difficulty TEXT,question_type TEXT,prompt TEXT,options_json TEXT,answer_json TEXT,explanation TEXT,source_type TEXT,source_reference TEXT,language TEXT,exam_section TEXT,exam_section_method TEXT,question_kind TEXT,exam_origin TEXT);
   CREATE TABLE fe_exemption_occurrences(sitting_date TEXT,original_question INTEGER,fiscal_year TEXT,canonical_question_id TEXT REFERENCES questions(id),official_answer TEXT,question_url TEXT,answer_url TEXT,PRIMARY KEY(sitting_date,original_question));
   CREATE TABLE study_attempts(id TEXT PRIMARY KEY,question_id TEXT REFERENCES questions(id));
   CREATE TABLE question_review_state(question_id TEXT PRIMARY KEY REFERENCES questions(id),mastered INTEGER);
   INSERT INTO questions(id,answer_json) VALUES('fe-ipa-official-2025-a-10','"a"');
   INSERT INTO study_attempts VALUES('attempt','fe-ipa-official-2025-a-10'); INSERT INTO question_review_state VALUES('fe-ipa-official-2025-a-10',1);`)
  const sql=readFileSync(new URL('../migrations/0170_fe_exemption_waf_repeats.sql',import.meta.url),'utf8');db.exec(sql);db.exec(sql)
  const rows=db.prepare('SELECT o.*,q.answer_json FROM fe_exemption_occurrences o JOIN questions q ON q.id=o.canonical_question_id').all()
  assert.equal(rows.length,3);assert.equal(new Set(rows.map(r=>r.canonical_question_id)).size,2)
  for(const r of rows)assert.equal(JSON.parse(r.answer_json),r.official_answer)
  assert.equal(rows.find(r=>r.sitting_date==='2021-01-24').canonical_question_id,rows.find(r=>r.sitting_date==='2022-12-11').canonical_question_id)
  assert.notEqual(rows.find(r=>r.sitting_date==='2022-07-24').canonical_question_id,rows.find(r=>r.sitting_date==='2022-12-11').canonical_question_id)
  assert.equal(db.prepare('SELECT COUNT(*) n FROM study_attempts').get().n,1);assert.equal(db.prepare('SELECT mastered FROM question_review_state').get().mastered,1)
  assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(),[])
 }finally{db.close()}
})
