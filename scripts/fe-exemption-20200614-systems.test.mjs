import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {DatabaseSync} from 'node:sqlite'

test('June 2020 systems questions and exact 2019 repeats match the IPA answer sheet',()=>{
 const db=new DatabaseSync(':memory:')
 try {
  db.exec(`PRAGMA foreign_keys=ON;
   CREATE TABLE questions(id TEXT PRIMARY KEY,track_id TEXT,topic TEXT,difficulty TEXT,question_type TEXT,prompt TEXT,options_json TEXT,answer_json TEXT,explanation TEXT,source_type TEXT,source_reference TEXT,language TEXT,exam_section TEXT,exam_section_method TEXT,question_kind TEXT,exam_origin TEXT);
   CREATE TABLE fe_exemption_occurrences(sitting_date TEXT,original_question INTEGER,fiscal_year TEXT,canonical_question_id TEXT REFERENCES questions(id),official_answer TEXT,question_url TEXT,answer_url TEXT,PRIMARY KEY(sitting_date,original_question));
   CREATE TABLE study_attempts(id TEXT PRIMARY KEY,question_id TEXT REFERENCES questions(id));`)
  const add=db.prepare('INSERT INTO questions(id,answer_json) VALUES(?,?)')
  for(const [q,a] of [[11,'d'],[18,'d'],[19,'a'],[24,'c'],[27,'b']])add.run(`fe-ipa-2019-spring-am-adapt-${q}`,JSON.stringify(a))
  db.exec("INSERT INTO study_attempts VALUES('keep','fe-ipa-2019-spring-am-adapt-11')")
  const sql=readFileSync(new URL('../migrations/0177_fe_exemption_20200614_systems.sql',import.meta.url),'utf8');db.exec(sql);db.exec(sql)
  const rows=db.prepare('SELECT o.original_question,o.official_answer,q.answer_json FROM fe_exemption_occurrences o JOIN questions q ON q.id=o.canonical_question_id ORDER BY o.original_question').all()
  const keys='d c b c d a b c d c d c b d b b d'.split(' ')
  assert.equal(rows.length,17)
  rows.forEach((row,i)=>{assert.equal(row.original_question,14+i);assert.equal(row.official_answer,keys[i]);assert.equal(JSON.parse(row.answer_json),keys[i])})
  assert.equal(db.prepare('SELECT COUNT(*) n FROM study_attempts').get().n,1);assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(),[])
 }finally{db.close()}
})
test('calculations and the text equivalent of the parity circuit',()=>{
 assert.ok(Math.abs(.2*.3+2.2*.7-1.6)<1e-12)
 assert.ok(1-(1-.8)**3>1-(1-.7)**4)
 assert.equal(12*8/(1.5*.5),128)
 for(let n=0;n<16;n++){const bits=[0,1,2,3].map(i=>(n>>i)&1);const xnor=1^(bits[0]^bits[1]^bits[2]^bits[3]);assert.equal(xnor,bits.reduce((a,b)=>a+b,0)%2===0?1:0)}
})
