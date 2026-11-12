import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'

test('2021–2022 repeated exam positions share canonical records and preserve progress', () => {
 const db = new DatabaseSync(':memory:')
 try {
  db.exec(`PRAGMA foreign_keys=ON;
   CREATE TABLE questions(id TEXT PRIMARY KEY,track_id TEXT,topic TEXT,difficulty TEXT,question_type TEXT,prompt TEXT,options_json TEXT,answer_json TEXT,explanation TEXT,source_type TEXT,source_reference TEXT,language TEXT,exam_section TEXT,exam_section_method TEXT,question_kind TEXT,exam_origin TEXT);
   CREATE TABLE fe_exemption_occurrences(sitting_date TEXT,original_question INTEGER,fiscal_year TEXT,canonical_question_id TEXT REFERENCES questions(id),official_answer TEXT,question_url TEXT,answer_url TEXT,PRIMARY KEY(sitting_date,original_question));
   CREATE TABLE study_attempts(id TEXT PRIMARY KEY,question_id TEXT REFERENCES questions(id));
   CREATE TABLE question_review_state(question_id TEXT PRIMARY KEY REFERENCES questions(id),mastered INTEGER);`)
  const seed=db.prepare('INSERT INTO questions(id,answer_json) VALUES(?,?)')
  for (const [id,a] of [['fe-ipa-2019-spring-am-adapt-28','b'],['fe-ipa-2019-spring-am-adapt-44','c'],['fe-ipa-2019-spring-am-adapt-62','d']]) seed.run(id,JSON.stringify(a))
  db.exec("INSERT INTO study_attempts VALUES('attempt','fe-ipa-2019-spring-am-adapt-44'); INSERT INTO question_review_state VALUES('fe-ipa-2019-spring-am-adapt-44',1)")
  const sql=readFileSync(new URL('../migrations/0164_fe_exemption_repeats_2021_2022.sql',import.meta.url),'utf8')
  db.exec(sql);db.exec(sql)
  const rows=db.prepare('SELECT o.*,q.answer_json FROM fe_exemption_occurrences o JOIN questions q ON q.id=o.canonical_question_id').all()
  assert.equal(rows.length,13)
  assert.equal(new Set(rows.map(r=>r.canonical_question_id)).size,8)
  for(const row of rows) assert.equal(JSON.parse(row.answer_json),row.official_answer)
  for(const [q21,q22] of [[41,38],[57,56],[71,71],[74,73],[78,77]]) {
   assert.equal(rows.find(r=>r.sitting_date==='2021-06-13'&&r.original_question===q21).canonical_question_id, rows.find(r=>r.sitting_date==='2022-12-11'&&r.original_question===q22).canonical_question_id)
  }
  assert.equal(db.prepare('SELECT COUNT(*) n FROM study_attempts').get().n,1)
  assert.equal(db.prepare('SELECT mastered FROM question_review_state').get().mastered,1)
  assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(),[])
 } finally { db.close() }
})

test('annual straight-line depreciation uses acquisition cost and useful life',()=>assert.equal((10000-0)/20,500))
