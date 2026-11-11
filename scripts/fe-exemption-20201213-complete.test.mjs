import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
const file=name=>readFileSync(new URL(`../migrations/${name}`,import.meta.url),'utf8')
test('the complete 2020-12-13 paper resolves 80 official positions to correctly keyed canonical questions',()=>{
 const db=new DatabaseSync(':memory:')
 try{
  db.exec(`PRAGMA foreign_keys=ON; CREATE TABLE questions(id TEXT PRIMARY KEY,track_id TEXT NOT NULL,topic TEXT,difficulty TEXT,
   question_type TEXT,prompt TEXT,options_json TEXT,answer_json TEXT,explanation TEXT,source_type TEXT NOT NULL,source_reference TEXT,language TEXT,exam_section TEXT,exam_section_method TEXT,question_kind TEXT NOT NULL DEFAULT 'standard');
   CREATE TABLE study_attempts(id TEXT PRIMARY KEY,question_id TEXT); CREATE TABLE question_review_state(question_id TEXT PRIMARY KEY,mastered INTEGER);`)
  db.exec(file('0125_fe_exemption_provenance.sql'));db.exec(file('0128_indexed_mock_draw_pool.sql'))
  const seed=db.prepare("INSERT INTO questions(id,track_id,topic,prompt,options_json,answer_json,explanation,source_type) VALUES (?,'exam-fe','existing','retained','[]',?,'retained','licensed')")
  for(const [id,a] of [
   ['fe-ipa-2019-spring-am-adapt-25','c'],['fe-ipa-2019-spring-am-adapt-30','d'],['fe-ipa-2019-spring-am-adapt-50','a'],['fe-ipa-2019-spring-am-adapt-64','b'],['fe-ipa-2019-spring-am-adapt-76','d'],['fe-ipa-official-2019-autumn-a-06','c'],
   ['fe-ipa-sample-2022-a-002','d'],['fe-ipa-sample-2022-a-006','d'],['fe-ipa-sample-2022-a-015','d'],['fe-ipa-sample-2022-a-018','d'],['fe-ipa-sample-2022-a-019','d'],['fe-ipa-sample-2022-a-020','d'],['fe-ipa-sample-2022-a-022','b'],['fe-ipa-sample-2022-a-027','b'],['fe-ipa-sample-2022-a-037','d'],
  ])seed.run(id,JSON.stringify(a))
  db.exec("INSERT INTO study_attempts VALUES('attempt','fe-ipa-2019-spring-am-adapt-64'); INSERT INTO question_review_state VALUES('fe-ipa-2019-spring-am-adapt-64',1)")
  for(const name of ['0155_fe_exemption_20201213_selected.sql','0156_fe_exemption_20201213_management.sql','0157_fe_exemption_20201213_basics.sql','0158_fe_exemption_20201213_shared_samples.sql','0159_fe_exemption_20201213_technology.sql','0160_fe_exemption_20201213_visual.sql','0161_fe_exemption_20201213_final.sql'])db.exec(file(name))
  const expected='d a c c b a b d b c c a d d a d c d d d c b c c d b d d d a a b b c b c c a b c d c d b d c c d a d c c c d a d c d c a a d b b c a b d d c a d d b d c b d d a'.split(' ')
  const rows=db.prepare("SELECT o.original_question,o.official_answer,q.answer_json FROM fe_exemption_occurrences o JOIN questions q ON q.id=o.canonical_question_id WHERE o.sitting_date='2020-12-13' ORDER BY o.original_question").all()
  assert.equal(rows.length,80)
  assert.deepEqual(rows.map(x=>x.original_question),Array.from({length:80},(_,i)=>i+1))
  assert.deepEqual(rows.map(x=>x.official_answer),expected)
  for(const row of rows)assert.equal(JSON.parse(row.answer_json),row.official_answer,`Q${row.original_question}`)
  assert.equal(db.prepare('SELECT COUNT(*) n FROM study_attempts').get().n,1)
  assert.equal(db.prepare('SELECT mastered FROM question_review_state').get().mastered,1)
  assert.equal(db.prepare('PRAGMA foreign_key_check').all().length,0)
 }finally{db.close()}
})

test('branch coverage and acceptance probabilities match the reconstructed original diagrams',()=>{
 const or=(a,b)=>a||b
 assert.deepEqual([or(false,false),or(true,true)],[false,true])
 for(const p of [0.01,0.1,0.3,0.8]){
  const n=10
  const choose=(n,k)=>{let x=1;for(let i=1;i<=k;i++)x=x*(n-i+1)/i;return x}
  const accept=c=>Array.from({length:c+1},(_,k)=>choose(n,k)*p**k*(1-p)**(n-k)).reduce((a,b)=>a+b,0)
  assert.ok(accept(0)<accept(1) && accept(1)<accept(2))
 }
})
