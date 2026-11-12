import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
const file=name=>readFileSync(new URL(`../migrations/${name}`,import.meta.url),'utf8')

test('visual questions and shared occurrences preserve keys and existing learning history',()=>{
 const db=new DatabaseSync(':memory:')
 try{
  db.exec(`PRAGMA foreign_keys=ON; CREATE TABLE questions(id TEXT PRIMARY KEY,track_id TEXT NOT NULL,topic TEXT,difficulty TEXT,
   question_type TEXT,prompt TEXT,options_json TEXT,answer_json TEXT,explanation TEXT,source_type TEXT NOT NULL,source_reference TEXT,language TEXT,exam_section TEXT,exam_section_method TEXT,question_kind TEXT NOT NULL DEFAULT 'standard');
   CREATE TABLE study_attempts(id TEXT PRIMARY KEY, question_id TEXT);
   CREATE TABLE question_review_state(question_id TEXT PRIMARY KEY,mastered INTEGER);`)
  db.exec(file('0125_fe_exemption_provenance.sql'));db.exec(file('0128_indexed_mock_draw_pool.sql'))
  const ins=db.prepare("INSERT INTO questions(id,track_id,topic,prompt,options_json,answer_json,explanation,source_type) VALUES (?,'exam-fe','existing','retained','[]',?,'retained','licensed')")
  for(const [id,a] of [['fe-ipa-sample-2022-a-037','d'],['fe-ipa-2019-spring-am-adapt-64','b']]) ins.run(id,JSON.stringify(a))
  db.exec("INSERT INTO study_attempts VALUES('keep','fe-ipa-sample-2022-a-037'); INSERT INTO question_review_state VALUES('fe-ipa-2019-spring-am-adapt-64',1)")
  const migration=file('0160_fe_exemption_20201213_visual.sql');db.exec(migration);db.exec(migration)
  const rows=db.prepare(`SELECT o.sitting_date,o.original_question,o.official_answer,o.canonical_question_id,q.answer_json,q.options_json
   FROM fe_exemption_occurrences o JOIN questions q ON q.id=o.canonical_question_id ORDER BY o.sitting_date,o.original_question`).all()
  assert.deepEqual(rows.map(x=>[x.sitting_date,x.original_question,x.official_answer]),[
   ['2020-12-13',2,'a'],['2020-12-13',12,'a'],['2020-12-13',22,'b'],['2020-12-13',43,'d'],
   ['2020-12-13',52,'c'],['2020-12-13',53,'c'],['2020-12-13',63,'b'],['2020-12-13',64,'b'],['2022-07-24',65,'b']])
  for(const r of rows){assert.equal(JSON.parse(r.answer_json),r.official_answer);if(r.canonical_question_id.startsWith('fe-exempt'))assert.equal(JSON.parse(r.options_json).length,4)}
  assert.equal(db.prepare("SELECT COUNT(*) n FROM mock_question_pool WHERE exam_origin='fe_exemption'").get().n,6)
  assert.equal(db.prepare('SELECT COUNT(*) n FROM study_attempts').get().n,1)
  assert.equal(db.prepare('SELECT mastered FROM question_review_state').get().mastered,1)
  assert.equal(db.prepare('PRAGMA foreign_key_check').all().length,0)
  assert.doesNotMatch(migration,/\b(?:DELETE|UPDATE|REPLACE|DROP)\b/i)
 }finally{db.close()}
})

test('truth tables, interrupt schedule, critical path and observed productivity validate answers',()=>{
 for(const a of [0,1])for(const b of [0,1]){
  assert.equal(Boolean(((!a)&&b)||(a&&b)),!!b)
  assert.equal((!a)&&(!b),!(a||b))
 }
 // B runs 0–1 and 1.5–2, A runs 1–1.5, 2.5–3 and 3.5–4.
 assert.equal(5-(1.5+3*0.5),2)
 const earliest={s:0,n1:10,n2:10,n3:30,n4:20,n5:50,end:60}
 const latest={s:0,n1:10,n2:10,n3:30,n4:50,n5:50,end:60}
 assert.equal(latest.n4-earliest.n1-10,30)
 assert.equal(earliest.end,60)
 const planned=10*0.5*30, actualRate=30/(10*10), required=(planned-30)/(actualRate*20)
 assert.equal(required-10,10)
})
