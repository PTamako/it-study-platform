import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'

const data = JSON.parse(readFileSync(new URL('./data/fe-ipa-2019-spring-51-60-reviewed.json',import.meta.url),'utf8'))
const migration = readFileSync(new URL('../migrations/0132_fe_ipa_2019_spring_am_51_60.sql',import.meta.url),'utf8')
const correct = {51:'b',52:'d',53:'d',54:'b',55:'b',56:'a',57:'d',58:'a',59:'d',60:'d'}
const pages = {51:23,52:23,53:24,54:24,55:25,56:25,57:25,58:26,59:26,60:27}
const Q='https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000ddiw-att/2019h31h_fe_am_qs.pdf'
const A='https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000ddiw-att/2019h31h_fe_am_ans.pdf'

test('2019 spring IPA official sheet keys 51-60 match source-reviewed adaptations',()=>{
 assert.equal(data.items.length,10)
 assert.deepEqual(data.items.map(x=>x.original_number),Array.from({length:10},(_,i)=>i+51))
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

test('project network and coding workload calculations preserve printed charts',()=>{
 const row=n=>data.items.find(x=>x.original_number===n)
 assert.equal(row(51).options[row(51).answer],'スコープ')
 assert.match(row(52).options[row(52).answer],/試験を開始して20分後に受付を終了/)
 assert.equal(2+2+2+2+4,12,'A B E H J critical path')
 assert.equal(2+1+3+1+4,11,'A C F I J')
 assert.equal(2+4+3,9,'A D G')
 assert.equal(row(53).options[row(53).answer],'12日')
 assert.equal((20*1+10*3+5*9)*(1+8)/95,9)
 assert.equal(row(54).options[row(54).answer],'9人')
 assert.match(row(55).options[row(55).answer],/優れた業務方式/)
 assert.match(row(56).options[row(56).answer],/旧システムから新システム/)
 assert.equal(row(57).options[row(57).answer],'ロールフォワード')
 assert.match(row(58).options[row(58).answer],/文書や記録/)
 assert.match(row(59).options[row(59).answer],/独立した内部監査/)
 assert.match(row(60).options[row(60).answer],/本番サーバのすぐ近く/)
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
 assert.match(migration,/fe-ipa-2019-spring-am-adapt-60/)
 assert.match(migration,/FE旧制度午前/)
})
