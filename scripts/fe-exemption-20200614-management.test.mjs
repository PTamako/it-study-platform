import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'

test('2020 June Q53–64 preserve IPA answers, reuse repeats and protect history', () => {
 const db = new DatabaseSync(':memory:')
 try {
  db.exec(`PRAGMA foreign_keys=ON;
    CREATE TABLE questions(id TEXT PRIMARY KEY,track_id TEXT,topic TEXT,difficulty TEXT,question_type TEXT,prompt TEXT,options_json TEXT,answer_json TEXT,explanation TEXT,source_type TEXT,source_reference TEXT,language TEXT,exam_section TEXT,exam_section_method TEXT,question_kind TEXT,exam_origin TEXT);
    CREATE TABLE fe_exemption_occurrences(sitting_date TEXT,original_question INTEGER,fiscal_year TEXT,canonical_question_id TEXT REFERENCES questions(id),official_answer TEXT,question_url TEXT,answer_url TEXT,PRIMARY KEY(sitting_date,original_question));
    CREATE TABLE study_attempts(id TEXT PRIMARY KEY,question_id TEXT REFERENCES questions(id));`)
  const repeated = [[55,'fe-ipa-2019-spring-am-adapt-55','b'],[58,'fe-ipa-2019-spring-am-adapt-59','d'],[61,'fe-ipa-2019-spring-am-adapt-61','b'],[62,'fe-exempt-2022-20221211-q62','a'],[63,'fe-ipa-2019-spring-am-adapt-63','b']]
  for (const [,id,key] of repeated) db.prepare('INSERT INTO questions(id,answer_json) VALUES (?,?)').run(id,JSON.stringify(key))
  db.exec("INSERT INTO study_attempts VALUES ('keep','fe-ipa-2019-spring-am-adapt-55')")
  const sql=readFileSync(new URL('../migrations/0197_fe_exemption_20200614_management.sql',import.meta.url),'utf8')
  db.exec(sql);db.exec(sql)
  const rows=db.prepare('SELECT o.*,q.answer_json,q.options_json,q.explanation,q.prompt,q.exam_section FROM fe_exemption_occurrences o JOIN questions q ON q.id=o.canonical_question_id ORDER BY o.original_question').all()
  const keys=['d','d','b','c','c','d','b','c','b','a','b','b']; assert.equal(rows.length,12)
  rows.forEach((row,i)=>{assert.equal(row.original_question,53+i);assert.equal(row.official_answer,keys[i]);assert.equal(JSON.parse(row.answer_json),keys[i]);if(!repeated.some(([n])=>n===row.original_question)){assert.equal(JSON.parse(row.options_json).length,4);assert.match(row.explanation,/中文：/);assert.equal(row.exam_section,'A')}})
  for(const [n,id] of repeated) assert.equal(rows[n-53].canonical_question_id,id)
  assert.equal(db.prepare('SELECT COUNT(*) n FROM questions').get().n,12)
  assert.equal(db.prepare('SELECT COUNT(*) n FROM study_attempts').get().n,1)
  assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(),[])
 } finally {db.close()}
})
test('independent calculations for critical path, availability, work and NPV',()=>{
 const paths=[[2,3,1,2,3],[2,3,1,1,3,2],[2,3,3,2,3],[2,3,4,2,3]].map(p=>p.reduce((a,b)=>a+b,0))
 assert.deepEqual(paths,[11,12,13,14]); assert.equal((500/10+10)*1.1,66)
 assert.equal(Math.round((420-7)/420*1000)/10,98.3)
 const npv=values=>values.reduce((sum,v,i)=>sum+v/1.05**(i+1),-220)
 const values=[[40,80,120],[120,80,40],[80,80,80]].map(npv)
 assert.ok(Math.abs(values[0]+5.68)<.01);assert.ok(Math.abs(values[1]-1.40)<.01);assert.ok(Math.abs(values[2]+2.14)<.01)
 assert.ok(values[1]>0 && values[1]>values[0] && values[1]>values[2])
})
