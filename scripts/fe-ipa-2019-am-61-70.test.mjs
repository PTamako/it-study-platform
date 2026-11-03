import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'

const data = JSON.parse(readFileSync(new URL('./data/fe-ipa-2019-spring-61-70-reviewed.json',import.meta.url),'utf8'))
const migration = readFileSync(new URL('../migrations/0133_fe_ipa_2019_spring_am_61_70.sql',import.meta.url),'utf8')
const correct = {61:'b',62:'d',63:'b',64:'b',65:'a',66:'d',67:'b',68:'b',69:'b',70:'b'}
const pages = {61:27,62:27,63:28,64:28,65:29,66:30,67:30,68:30,69:31,70:31}
const Q='https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000ddiw-att/2019h31h_fe_am_qs.pdf'
const A='https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000ddiw-att/2019h31h_fe_am_ans.pdf'

test('2019 spring IPA official sheet keys 61-70 match source-reviewed adaptations',()=>{
 assert.equal(data.items.length,10)
 assert.deepEqual(data.items.map(x=>x.original_number),Array.from({length:10},(_,i)=>i+61))
 assert.equal(new Set(data.items.map(x=>x.id)).size,10)
 assert.equal(new Set(data.items.map(x=>x.prompt)).size,10)
 for(const row of data.items){
   assert.equal(row.id,'fe-ipa-2019-spring-am-adapt-'+row.original_number)
   assert.equal(row.pdf_page,pages[row.original_number])
   assert.equal(row.exam,'FE');assert.equal(row.year,2019)
   assert.equal(row.session,'spring');assert.equal(row.original_section,'午前')
   assert.equal(row.current_section,'A')
   assert.equal(row.source_type,'licensed')
   assert.equal(row.source_reference,Q)
   assert.equal(row.official_answer_reference,A)
   assert.equal('abcd'[row.answer],correct[row.original_number])
   assert.equal(row.options.length,4)
   assert.equal(new Set(row.options).size,4)
   assert.ok(row.explanation_ja.length>=30 && row.explanation_zh.length>=20)
   assert.ok(row.adaptation)
 }
})

test('BI, interactive customer feedback and ROI chart are faithful to official questions',()=>{
 const row=n=>data.items.find(q=>q.original_number===n)
 assert.match(row(61).options[row(61).answer],/業務プロセスを実現する情報システム/)
 assert.match(row(62).options[row(62).answer],/見たい時刻/)
 assert.match(row(63).options[row(63).answer],/社内の業務システム/)
 assert.match(row(64).prompt,/a=全体×定期/)
 assert.match(row(64).prompt,/b=全体×即時/)
 assert.match(row(64).prompt,/c=個人×定期/)
 assert.match(row(64).prompt,/d=個人×即時/)
 assert.match(row(64).options[row(64).answer],/本人のスマートフォン/)
 const benefits=[
  [15,30,45,30,15],[105,75,45,15,0],[60,75,90,75,60],[105,105,105,105,105]
 ]
 const investments=[100,200,300,400]
 const roi=benefits.map((arr,i)=>(arr.reduce((a,b)=>a+b,0)-investments[i])/investments[i])
 assert.deepEqual(roi.map(x=>Math.round(x*10000)/100),[35,20,20,31.25])
 assert.equal(roi.indexOf(Math.max(...roi)),0)
 for(const [number,values] of benefits.entries()){
  const prompt=row(65).prompt
  assert.ok(prompt.includes('投資'+investments[number]),prompt)
  assert.ok(prompt.includes('['+values.join(',')+']'),prompt)
 }
 assert.equal(row(65).options[row(65).answer],'a')
 assert.match(row(66).options[row(66).answer],/可用性・性能/)
 assert.match(row(67).options[row(67).answer],/模倣しにくく/)
 assert.equal(row(68).options[row(68).answer],'ニッチ戦略')
 assert.match(row(69).options[row(69).answer],/コンバージョン率/)
 assert.match(row(70).options[row(70).answer],/製造方法や提供工程を革新/)
})

test('additive migration remains idempotent and never alters prior study history',()=>{
 const db=new DatabaseSync(':memory:')
 try{
   db.exec(`CREATE TABLE questions(
     id TEXT PRIMARY KEY,track_id TEXT,topic TEXT,difficulty TEXT,question_type TEXT,prompt TEXT,
     options_json TEXT,answer_json TEXT,explanation TEXT,source_type TEXT,source_reference TEXT,
     language TEXT,exam_section TEXT,exam_section_method TEXT);
     CREATE TABLE study_attempts(id TEXT PRIMARY KEY,question_id TEXT);
     CREATE TABLE question_review_state(question_id TEXT PRIMARY KEY,mastered INTEGER);
     INSERT INTO questions(id,track_id,topic,prompt,source_type)
       VALUES ('already','exam-fe','kept','original item','official');
     INSERT INTO study_attempts VALUES ('old-attempt','already');
     INSERT INTO question_review_state VALUES ('already',1);`)
   db.exec(migration)
   const scalar=q=>db.prepare(q).get().n
   assert.equal(scalar("SELECT COUNT(*) n FROM questions"),11)
   assert.equal(scalar("SELECT COUNT(*) n FROM questions WHERE source_type='licensed'"),10)
   for(const q of db.prepare("SELECT * FROM questions WHERE id LIKE 'fe-ipa-2019-spring-am-adapt-%'").all()){
     assert.equal(q.track_id,'exam-fe')
     assert.equal(q.source_reference,Q)
     assert.equal(q.source_type,'licensed')
     assert.equal(q.exam_section,'A')
     assert.equal(q.exam_section_method,'explicit')
     assert.match(q.prompt,/旧制度午前 問\d+・改編/)
     assert.match(q.explanation,/中文解析/)
     assert.equal(JSON.parse(q.options_json).length,4)
     assert.ok(['a','b','c','d'].includes(JSON.parse(q.answer_json)))
   }
   db.exec(migration)
   assert.equal(scalar("SELECT COUNT(*) n FROM questions"),11)
   assert.equal(scalar("SELECT COUNT(*) n FROM study_attempts"),1)
   assert.equal(db.prepare("SELECT mastered FROM question_review_state WHERE question_id='already'").get().mastered,1)
   assert.equal(db.prepare("SELECT prompt FROM questions WHERE id='already'").get().prompt,'original item')
 }finally{db.close()}
})

test('no made-up CBT source or destructive statements in the generated SQL',()=>{
 assert.equal((migration.match(/INSERT OR IGNORE INTO questions/g)||[]).length,10)
 assert.doesNotMatch(migration,/DELETE FROM|DROP TABLE|UPDATE questions|REPLACE INTO/i)
 assert.match(migration,/fe-ipa-2019-spring-am-adapt-70/)
 assert.match(migration,/FE旧制度午前/)
})
