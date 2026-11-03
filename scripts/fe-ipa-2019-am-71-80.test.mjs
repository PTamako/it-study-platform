import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'

const data = JSON.parse(readFileSync(new URL('./data/fe-ipa-2019-spring-71-80-reviewed.json',import.meta.url),'utf8'))
const migration = readFileSync(new URL('../migrations/0134_fe_ipa_2019_spring_am_71_80.sql',import.meta.url),'utf8')
const correct = {71:'d',72:'d',73:'d',74:'c',75:'b',76:'d',77:'a',78:'d',79:'d',80:'c'}
const pages = {71:31,72:32,73:32,74:33,75:33,76:33,77:34,78:34,79:35,80:35}
const Q='https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000ddiw-att/2019h31h_fe_am_qs.pdf'
const A='https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000ddiw-att/2019h31h_fe_am_ans.pdf'

test('2019 spring IPA official sheet keys 71-80 match source-reviewed adaptations',()=>{
 assert.equal(data.items.length,10)
 assert.deepEqual(data.items.map(x=>x.original_number),Array.from({length:10},(_,i)=>i+71))
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

test('fishbone cause/effect directions and all original inventory figures are preserved',()=>{
 const row=n=>data.items.find(q=>q.original_number===n)
 assert.match(row(71).options[row(71).answer],/住宅内|家庭のエネルギー/)
 assert.match(row(72).options[row(72).answer],/個人が商品レビュー/)
 assert.match(row(73).options[row(73).answer],/個人が所有する未利用/)
 assert.match(row(74).options[row(74).answer],/大型ディスプレイ/)
 assert.match(row(75).options[row(75).answer],/グリーン購入/)
 assert.match(row(76).options[row(76).answer],/社内の疑似企業/)
 assert.match(row(77).prompt,/下側の要因b/)
 assert.match(row(77).prompt,/主矢印へ入り込む/)
 assert.match(row(77).options[row(77).answer],/bはaを発生させる原因/)
 const products=[
  {name:'A',demand:1500,stock:1400,profit:1},
  {name:'B',demand:900,stock:1000,profit:2},
  {name:'C',demand:800,stock:1000,profit:3},
  {name:'D',demand:700,stock:500,profit:4},
  {name:'E',demand:500,stock:200,profit:5}
 ]
 const loss=products.reduce((sum,p)=>sum+Math.max(0,p.demand-p.stock)*p.profit,0)
 assert.equal(loss,2400)
 for(const p of products){
  assert.match(row(78).prompt,new RegExp(p.name+'=\\('+p.demand+','+p.stock+','+p.profit+'\\)'))
 }
 assert.equal(row(78).options[row(78).answer],'2,400千円')
 assert.match(row(79).options[row(79).answer],/同一性保持権/)
 assert.equal(row(80).options[row(80).answer],'IETF')
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
 assert.match(migration,/fe-ipa-2019-spring-am-adapt-80/)
 assert.match(migration,/FE旧制度午前/)
})
