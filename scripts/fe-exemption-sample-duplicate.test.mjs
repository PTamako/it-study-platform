import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {DatabaseSync} from 'node:sqlite'

const sql=readFileSync(new URL('../migrations/0176_fe_exemption_sample_duplicate.sql',import.meta.url),'utf8')
function database(){
 const db=new DatabaseSync(':memory:')
 db.exec(`PRAGMA foreign_keys=ON;
  CREATE TABLE questions(id TEXT PRIMARY KEY,answer_json TEXT);
  CREATE TABLE study_attempts(id TEXT PRIMARY KEY,question_id TEXT REFERENCES questions(id));
  CREATE TABLE question_review_state(question_id TEXT PRIMARY KEY REFERENCES questions(id) ON DELETE CASCADE);
  CREATE TABLE daily_grammar_answers(question_id TEXT);
  CREATE TABLE mock_question_pool(question_id TEXT PRIMARY KEY REFERENCES questions(id) ON DELETE CASCADE);
  CREATE TABLE fe_exemption_occurrences(sitting_date TEXT,original_question INTEGER,canonical_question_id TEXT REFERENCES questions(id),PRIMARY KEY(sitting_date,original_question));
  INSERT INTO questions VALUES('fe-exempt-2022-20221211-q10','"c"'),('fe-ipa-sample-2022-a-008','"c"');
  INSERT INTO fe_exemption_occurrences VALUES('2022-12-11',10,'fe-exempt-2022-20221211-q10');
  INSERT INTO mock_question_pool VALUES('fe-exempt-2022-20221211-q10'),('fe-ipa-sample-2022-a-008');`)
 return db
}
test('unused exact duplicate is consolidated without changing sample study history',()=>{
 const db=database();try{
  db.exec("INSERT INTO study_attempts VALUES('saved','fe-ipa-sample-2022-a-008'); INSERT INTO question_review_state VALUES('fe-ipa-sample-2022-a-008');")
  db.exec(sql);db.exec(sql)
  assert.equal(db.prepare("SELECT canonical_question_id AS id FROM fe_exemption_occurrences").get().id,'fe-ipa-sample-2022-a-008')
  assert.equal(db.prepare('SELECT COUNT(*) n FROM questions').get().n,1)
  assert.equal(db.prepare('SELECT COUNT(*) n FROM mock_question_pool').get().n,1)
  assert.equal(db.prepare('SELECT COUNT(*) n FROM study_attempts').get().n,1)
  assert.equal(db.prepare('SELECT COUNT(*) n FROM question_review_state').get().n,1)
  assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(),[])
 }finally{db.close()}
})
for(const table of ['study_attempts','question_review_state']) test(`duplicate with existing ${table} is not removed`,()=>{
 const db=database();try{
  db.exec(table==='study_attempts'?"INSERT INTO study_attempts VALUES('saved','fe-exempt-2022-20221211-q10')":"INSERT INTO question_review_state VALUES('fe-exempt-2022-20221211-q10')")
  db.exec(sql)
  assert.equal(db.prepare('SELECT COUNT(*) n FROM questions').get().n,2)
  assert.equal(db.prepare('SELECT canonical_question_id id FROM fe_exemption_occurrences').get().id,'fe-exempt-2022-20221211-q10')
  assert.equal(db.prepare(`SELECT COUNT(*) n FROM ${table}`).get().n,1)
 }finally{db.close()}
})
