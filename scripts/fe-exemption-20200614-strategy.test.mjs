import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {DatabaseSync} from 'node:sqlite'

test('2020 June Q65–80 match IPA keys, link repeats and preserve history',()=>{
 const db=new DatabaseSync(':memory:')
 try {
  db.exec(`PRAGMA foreign_keys=ON;
   CREATE TABLE questions(id TEXT PRIMARY KEY,track_id TEXT,topic TEXT,difficulty TEXT,question_type TEXT,prompt TEXT,options_json TEXT,answer_json TEXT,explanation TEXT,source_type TEXT,source_reference TEXT,language TEXT,exam_section TEXT,exam_section_method TEXT,question_kind TEXT,exam_origin TEXT);
   CREATE TABLE fe_exemption_occurrences(sitting_date TEXT,original_question INTEGER,fiscal_year TEXT,canonical_question_id TEXT REFERENCES questions(id),official_answer TEXT,question_url TEXT,answer_url TEXT,PRIMARY KEY(sitting_date,original_question));
   CREATE TABLE study_attempts(id TEXT PRIMARY KEY,question_id TEXT REFERENCES questions(id));
   INSERT INTO questions(id,answer_json) VALUES ('fe-ipa-2019-spring-am-adapt-71','"d"'),('fe-exempt-2022-20221211-q79','"b"');
   INSERT INTO study_attempts VALUES ('keep','fe-ipa-2019-spring-am-adapt-71');`)
  const sql=readFileSync(new URL('../migrations/0198_fe_exemption_20200614_strategy.sql',import.meta.url),'utf8');db.exec(sql);db.exec(sql)
  const rows=db.prepare('SELECT o.*,q.answer_json,q.options_json,q.explanation,q.exam_section FROM fe_exemption_occurrences o JOIN questions q ON q.id=o.canonical_question_id ORDER BY o.original_question').all()
  const answers=['d','b','b','d','a','d','d','c','d','b','d','d','b','d','b','d'];assert.equal(rows.length,16)
  rows.forEach((row,i)=>{assert.equal(row.original_question,65+i);assert.equal(row.official_answer,answers[i]);assert.equal(JSON.parse(row.answer_json),answers[i]);if(i!==5&&i!==14){assert.equal(JSON.parse(row.options_json).length,4);assert.match(row.explanation,/中文：/);assert.equal(row.exam_section,'A')}})
  assert.equal(rows[5].canonical_question_id,'fe-ipa-2019-spring-am-adapt-71');assert.equal(rows[14].canonical_question_id,'fe-exempt-2022-20221211-q79')
  assert.equal(db.prepare('SELECT COUNT(*) n FROM questions').get().n,16);assert.equal(db.prepare('SELECT COUNT(*) n FROM study_attempts').get().n,1);assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(),[])
 } finally {db.close()}
})
test('production capacity, economies, sequence and profit calculations',()=>{
 assert.deepEqual([.4,.3,.7,1.2].map((v,i)=>[450,320,680,1260][i]-v*1000),[50,20,-20,60])
 assert.ok(3300>1500*2&&1100>500*2&&1900<1500+500&&4200<3300+1100)
 const times={A:[7,3],B:[5,6],C:[4,2]}
 function finish(seq){let m1=0,m2=0;for(const name of seq){const [a,b]=times[name];m1+=a;m2=Math.max(m1,m2)+b}return m2}
 assert.deepEqual(['ACB','BAC','BCA','CBA'].map(finish),[22,18,19,19])
 assert.equal((300000+100000)/(500-100)/20/10,5)
})
