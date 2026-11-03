import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'

const data = JSON.parse(readFileSync(new URL('./data/fe-ipa-2019-spring-28-40-reviewed.json',import.meta.url),'utf8'))
const migration = readFileSync(new URL('../migrations/0129_fe_ipa_2019_spring_am_28_40.sql',import.meta.url),'utf8')
const correct = {28:'b',29:'c',30:'d',31:'a',32:'d',33:'d',34:'a',35:'c',36:'a',37:'c',38:'a',39:'a',40:'a'}
const pages = {28:14,29:14,30:15,31:15,32:15,33:15,34:16,35:16,36:17,37:17,38:18,39:18,40:18}
const Q='https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000ddiw-att/2019h31h_fe_am_qs.pdf'
const A='https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000ddiw-att/2019h31h_fe_am_ans.pdf'

test('2019 spring IPA official sheet keys 28-40 match source-reviewed adaptations',()=>{
 assert.equal(data.items.length,13)
 assert.deepEqual(data.items.map(x=>x.original_number),Array.from({length:13},(_,i)=>i+28))
 assert.equal(new Set(data.items.map(x=>x.id)).size,13)
 assert.equal(new Set(data.items.map(x=>x.prompt)).size,13)
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

test('diagram-equivalent conditions and calculations preserve official answers',()=>{
 const row=n=>data.items.find(x=>x.original_number===n)
 assert.match(row(28).prompt,/全ての商品行を残し/)
 assert.match(row(28).options[row(28).answer],/射影/)
 assert.match(row(29).prompt,/学部\.住所='新宿'/)
 assert.equal(row(29).options[row(29).answer],'甲と丁')
 assert.equal((2**(32-23))-2,510)
 assert.equal(row(32).options[row(32).answer],'510個')
 assert.equal(row(34).options[row(34).answer],'送信元80・宛先50001')
 assert.match(row(35).options[row(35).answer],/制御を分離/)
 assert.match(row(37).options[row(37).answer],/流出したID/)
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
   assert.equal(scalar("SELECT COUNT(*) n FROM questions"),14)
   assert.equal(scalar("SELECT COUNT(*) n FROM questions WHERE source_type='licensed'"),13)
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
   assert.equal(scalar("SELECT COUNT(*) n FROM questions"),14)
   assert.equal(scalar("SELECT COUNT(*) n FROM study_attempts"),1)
   assert.equal(db.prepare("SELECT mastered FROM question_review_state WHERE question_id='already'").get().mastered,1)
   assert.equal(db.prepare("SELECT prompt FROM questions WHERE id='already'").get().prompt,'original item')
 }finally{db.close()}
})

test('no made-up CBT source or destructive statements in the generated SQL',()=>{
 assert.equal((migration.match(/INSERT OR IGNORE INTO questions/g)||[]).length,13)
 assert.doesNotMatch(migration,/DELETE FROM|DROP TABLE|UPDATE questions|REPLACE INTO/i)
 assert.match(migration,/fe-ipa-2019-spring-am-adapt-40/)
 assert.match(migration,/FE旧制度午前/)
})
