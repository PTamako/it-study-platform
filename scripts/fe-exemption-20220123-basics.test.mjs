import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {DatabaseSync} from 'node:sqlite'
test('2022 January official keys, reused questions and history',()=>{
 const db=new DatabaseSync(':memory:')
 try{
  db.exec(`PRAGMA foreign_keys=ON;
   CREATE TABLE questions(id TEXT PRIMARY KEY,track_id TEXT,topic TEXT,difficulty TEXT,question_type TEXT,prompt TEXT,options_json TEXT,answer_json TEXT,explanation TEXT,source_type TEXT,source_reference TEXT,language TEXT,exam_section TEXT,exam_section_method TEXT,question_kind TEXT,exam_origin TEXT);
   CREATE TABLE fe_exemption_occurrences(sitting_date TEXT,original_question INTEGER,fiscal_year TEXT,canonical_question_id TEXT REFERENCES questions(id),official_answer TEXT,question_url TEXT,answer_url TEXT,PRIMARY KEY(sitting_date,original_question));
   CREATE TABLE study_attempts(id TEXT PRIMARY KEY,question_id TEXT REFERENCES questions(id));
   INSERT INTO questions(id,answer_json) VALUES ('fe-exempt-2022-20221211-q03','"d"'),('fe-ipa-2019-spring-am-adapt-71','"d"'),('fe-ipa-official-2019-spring-a-04','"c"'),('fe-exempt-2020-20200726-q10','"c"'),('fe-ipa-official-2024-a-03','"b"'),('fe-exempt-2020-20200614-q21','"c"'),('fe-exempt-2020-20200726-q23','"a"'),('fe-ipa-2019-spring-am-adapt-29','"c"'),('fe-ipa-official-2024-a-07','"c"'),('fe-ipa-2019-spring-am-adapt-33','"d"'),('fe-ipa-2019-spring-am-adapt-35','"c"'),('fe-ipa-sample-2022-a-031','"d"'),('fe-ipa-sample-2022-a-030','"a"'),('fe-exempt-2020-20200614-q40','"b"'),('fe-exempt-2020-20200614-q39','"a"'),('fe-ipa-2019-spring-am-adapt-42','"a"'),('fe-ipa-2019-spring-am-adapt-49','"a"'),('fe-exempt-2020-20200726-q54','"d"'),('fe-exempt-2020-20200726-q60','"d"'),('fe-exempt-2020-20200726-q61','"a"'),('fe-exempt-2020-20200726-q63','"a"'),('fe-ipa-2019-spring-am-adapt-72','"d"'),('fe-exempt-2020-20200726-q72','"b"'),('fe-ipa-2019-spring-am-adapt-78','"d"'),('fe-exempt-2020-20200614-q32','"c"'),('fe-exempt-2020-20200614-q71','"d"');
   INSERT INTO study_attempts VALUES('keep','fe-ipa-official-2019-spring-a-04');`)
  const sql=readFileSync(new URL('../migrations/0205_fe_exemption_20220123_basics.sql',import.meta.url),'utf8');db.exec(sql);db.exec(sql)
  const rows=db.prepare('SELECT o.*,q.answer_json,q.options_json,q.explanation FROM fe_exemption_occurrences o JOIN questions q ON q.id=o.canonical_question_id ORDER BY original_question').all()
  const keys='b d a b c c c b b c d b b b a a c a c b c c a d c a c c d c c b d c d d a b a c d a d c a d d b a b a c c d c c b d a c a a d b c c d c d d d b d b c c c d a c'.split(' ');assert.equal(rows.length,80)
  for(const row of rows){assert.equal(row.official_answer,keys[row.original_question-1]);assert.equal(JSON.parse(row.answer_json),row.official_answer);if(![2,70,5,10,13,22,23,27,28,33,34,35,37,38,39,42,49,54,58,61,62,73,74,78,31,71].includes(row.original_question)){assert.equal(JSON.parse(row.options_json).length,4);assert.match(row.explanation,/中文：/)}}
  assert.equal(db.prepare('SELECT COUNT(*) n FROM study_attempts').get().n,1);assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(),[])
 }finally{db.close()}
})
test('probability and algorithms',()=>{assert.ok(Math.abs(.2*.3+.3*.4+.5*.3-.33)<1e-12);assert.equal(1e6/(64000/8),125);assert.equal((19+5+16)%27,(6+5+2)%27);for(let x=0;x<65536;x++)assert.equal((x>>8)+((x%256)*256),((x&255)<<8)|(x>>8))})
