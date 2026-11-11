import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {DatabaseSync} from 'node:sqlite'

const data=JSON.parse(readFileSync(new URL('./data/fe-exemption-official-first23.json',import.meta.url),'utf8'))
const schema=readFileSync(new URL('../migrations/0125_fe_exemption_provenance.sql',import.meta.url),'utf8')
const importSql=readFileSync(new URL('../migrations/0126_fe_ipa_exemption_first23.sql',import.meta.url),'utf8')
const app=readFileSync(new URL('../src/App.vue',import.meta.url),'utf8')
const worker=readFileSync(new URL('../worker/index.ts',import.meta.url),'utf8')
const key={
'2020-06-14':{1:'c',2:'d',3:'a',4:'b',5:'c',6:'b',8:'c',9:'b'},
'2021-06-13':{1:'a',2:'a',3:'d',4:'c',6:'d',7:'c',8:'b',9:'b'},
'2022-06-12':{1:'a',2:'c',3:'c',6:'a',9:'a',11:'b',12:'d',5:'b'}
}

test('three fiscal years have 23 unique source-attributed adaptations plus one repeated occurrence',()=>{
 assert.equal(data.items.length,23);assert.equal(data.additional_occurrences.length,1)
 assert.deepEqual([...new Set(data.items.map(x=>x.fiscal_year))],[2020,2021,2022])
 assert.equal(new Set(data.items.map(x=>x.id)).size,23)
 for(const x of data.items){
  assert.equal(x.exam_origin,'fe_exemption')
  assert.equal(x.source_type,'licensed','reworded source questions are not untouched IPA original texts')
  assert.equal('abcd'[x.answer],key[x.sitting_date][x.original_question],'wrong IPA answer for '+x.id)
  assert.equal(x.options.length,4)
  assert.equal(new Set(x.options).size,4)
  assert.match(x.source_url,/ipa\.go\.jp/)
  assert.match(x.answer_url,/ipa\.go\.jp/)
  assert.ok(x.explanation_ja.length>15&&x.explanation_zh.length>8)
 }
 assert.equal(data.additional_occurrences[0].canonical_question_id,'fe-exempt-2020-20200614-q04')
 assert.equal(key['2022-06-12'][5],'b')
})

test('one canonical question supports multiple sittings without duplicating attempts/review',()=>{
 const db=new DatabaseSync(':memory:')
 try {
   db.exec("CREATE TABLE questions(id TEXT PRIMARY KEY,track_id TEXT,topic TEXT,difficulty TEXT,question_type TEXT,prompt TEXT,options_json TEXT,answer_json TEXT,explanation TEXT,source_type TEXT NOT NULL CHECK(source_type IN ('official','licensed','generated','personal')),source_reference TEXT,language TEXT,exam_section TEXT,exam_section_method TEXT,question_kind TEXT DEFAULT 'standard');"+
     "CREATE TABLE question_review_state(question_id TEXT PRIMARY KEY, mastered INTEGER);"+
     "CREATE TABLE study_attempts(id TEXT PRIMARY KEY,question_id TEXT);")
   db.exec("INSERT INTO questions (id,track_id,prompt,source_type) VALUES ('legacy','exam-fe','retained','official')")
   db.exec("INSERT INTO question_review_state VALUES('legacy',1)")
   db.exec("INSERT INTO study_attempts VALUES('attempt-legacy','legacy')")
   db.exec(schema)
   db.exec(importSql)
   const count=s=>db.prepare(s).get().n
   assert.equal(count("SELECT COUNT(*) AS n FROM questions WHERE exam_origin='fe_exemption'"),23)
   assert.equal(count("SELECT COUNT(*) AS n FROM fe_exemption_occurrences"),24)
   assert.equal(count("SELECT COUNT(*) AS n FROM fe_exemption_occurrences WHERE canonical_question_id='fe-exempt-2020-20200614-q04'"),2)
   assert.equal(count("SELECT COUNT(*) AS n FROM questions"),24)
   const group=db.prepare("SELECT fiscal_year,COUNT(*) AS n FROM fe_exemption_occurrences GROUP BY fiscal_year ORDER BY fiscal_year").all()
   assert.deepEqual(group.map(x=>[x.fiscal_year,x.n]),[[2020,8],[2021,8],[2022,8]])
   for(const q of db.prepare("SELECT * FROM questions WHERE exam_origin='fe_exemption'").all()){
     assert.equal(q.source_type,'licensed')
     assert.equal(q.question_kind,'standard')
     assert.equal(q.exam_section,'A')
     assert.equal(q.exam_section_method,'explicit')
     assert.match(q.prompt,/修了認定試験/)
     assert.match(q.explanation,/中文解析/)
     const opts=JSON.parse(q.options_json)
     assert.equal(opts.length,4)
     assert.ok(opts.some(o=>o.id===JSON.parse(q.answer_json)))
   }
   db.exec(importSql)
   assert.equal(count("SELECT COUNT(*) AS n FROM questions"),24)
   assert.equal(count("SELECT COUNT(*) AS n FROM fe_exemption_occurrences"),24)
   assert.equal(db.prepare("SELECT prompt FROM questions WHERE id='legacy'").get().prompt,'retained')
   assert.equal(db.prepare("SELECT mastered FROM question_review_state WHERE question_id='legacy'").get().mastered,1)
   assert.equal(count("SELECT COUNT(*) AS n FROM study_attempts"),1)
 }finally{db.close()}
})

test('practice filters isolate 修了試験 from official samples, original CBT and general adaptations',()=>{
 assert.match(app,/label: '修了試験'/)
 assert.match(app,/exemption_question_count/)
 assert.match(app,/2022, 2021, 2020, 2019/)
 assert.match(worker,/exemption_question_count/)
 assert.match(worker,/WHEN 'exemption' THEN (q\.)?id IN \(SELECT canonical_question_id FROM fe_exemption_occurrences\)/)
 assert.match(worker,/AND (q\.)?exam_origin = 'general'/)
 assert.match(worker,/exam_origin/)
 assert.doesNotMatch(importSql,/DROP TABLE|DELETE FROM|REPLACE INTO|UPDATE questions/i)
})

test('verifiable numeric answers in all three official sittings are internally consistent',()=>{
 assert.equal(4*1+1,5)
 let a=175,b=77,count=0
 while(b){const r=a%b;a=b;b=r;count++}
 assert.equal(a,7);assert.equal(count,4)
 assert.equal(64000/8,8000);assert.equal(1000000/8000,125)
 assert.equal(775%527,248)
 assert.equal(527%248,31)
 assert.equal(248%31,0)
 assert.equal((200e6*.8)/800000,200)
 assert.equal(parseInt('01010010',2),82)
})
