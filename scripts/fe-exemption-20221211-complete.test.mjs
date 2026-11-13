import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {DatabaseSync} from 'node:sqlite'

test('all 80 December 2022 positions can be assembled and match the IPA answer sheet',()=>{
 const db=new DatabaseSync(':memory:')
 try{
  db.exec(`PRAGMA foreign_keys=ON;
   CREATE TABLE questions(id TEXT PRIMARY KEY,track_id TEXT,topic TEXT,difficulty TEXT,question_type TEXT,prompt TEXT,options_json TEXT,answer_json TEXT,explanation TEXT,source_type TEXT,source_reference TEXT,language TEXT,exam_section TEXT,exam_section_method TEXT,question_kind TEXT,exam_origin TEXT);
   CREATE TABLE fe_exemption_occurrences(sitting_date TEXT,original_question INTEGER,fiscal_year TEXT,canonical_question_id TEXT REFERENCES questions(id),official_answer TEXT,question_url TEXT,answer_url TEXT,PRIMARY KEY(sitting_date,original_question));
   CREATE TABLE study_attempts(id TEXT PRIMARY KEY,question_id TEXT REFERENCES questions(id));`)
  // Independently transcribed from the official 2022-12-11 IPA answer table.
  const keys=('a b d c c b b c c c a c b b c d b a c b '+
              'c c b b d d d a b a a b c b a c d c d d '+
              'a c d a c a b d a a d d b a d b d b c c '+
              'd a d a b c d c d d c d c c c b c b b d').split(' ')
  const prior=[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,27,38,43,44,49,55,56,71,73,77]
  const addQuestion=db.prepare('INSERT INTO questions(id,answer_json,options_json,explanation) VALUES(?,?,?,?)')
  const addOccurrence=db.prepare("INSERT INTO fe_exemption_occurrences VALUES('2022-12-11',?,'2022',?,?,'paper','answers')")
  for(const n of prior){const id=`prior-${n}`;addQuestion.run(id,JSON.stringify(keys[n-1]),'[]','');addOccurrence.run(n,id,keys[n-1])}
  for(const [id,key] of [['fe-ipa-sample-2022-a-036','a'],['fe-ipa-sample-2022-a-042','d'],['fe-ipa-sample-2022-a-050','a'],['fe-ipa-sample-2022-a-053','d'],['fe-ipa-official-2023-a-17','c']]) addQuestion.run(id,JSON.stringify(key),'[]','既存の説明')
  db.prepare("INSERT INTO study_attempts VALUES('preserved','prior-1')").run()
  for(const file of ['0173_fe_exemption_20221211_network.sql','0174_fe_exemption_20221211_management.sql','0175_fe_exemption_20221211_strategy.sql']) db.exec(readFileSync(new URL(`../migrations/${file}`,import.meta.url),'utf8'))
  const rows=db.prepare("SELECT o.original_question,o.official_answer,q.answer_json FROM fe_exemption_occurrences o JOIN questions q ON q.id=o.canonical_question_id WHERE o.sitting_date='2022-12-11' ORDER BY o.original_question").all()
  assert.equal(rows.length,80)
  for(let i=0;i<80;i++){assert.equal(rows[i].original_question,i+1);assert.equal(rows[i].official_answer,keys[i]);assert.equal(JSON.parse(rows[i].answer_json),keys[i])}
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM study_attempts').get().n,1)
  assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(),[])
 }finally{db.close()}
})
