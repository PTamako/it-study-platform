import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'

const data = JSON.parse(readFileSync(new URL('./data/fe-ipa-2019-spring-41-50-reviewed.json',import.meta.url),'utf8'))
const migration = readFileSync(new URL('../migrations/0130_fe_ipa_2019_spring_am_41_50.sql',import.meta.url),'utf8')
const correct = {41:'b',42:'a',43:'a',44:'c',45:'b',46:'a',47:'b',48:'c',49:'a',50:'a'}
const pages = {41:19,42:19,43:19,44:20,45:20,46:20,47:21,48:21,49:22,50:22}
const Q='https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000ddiw-att/2019h31h_fe_am_qs.pdf'
const A='https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000ddiw-att/2019h31h_fe_am_ans.pdf'

test('2019 spring IPA official sheet keys 41-50 match source-reviewed adaptations',()=>{
 assert.equal(data.items.length,10)
 assert.deepEqual(data.items.map(x=>x.original_number),Array.from({length:10},(_,i)=>i+41))
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

test('risk, security and software test answers preserve the official concepts',()=>{
 const row=n=>data.items.find(x=>x.original_number===n)
 assert.match(row(41).options[row(41).answer],/影響の大きさと起こりやすさ/)
 assert.match(row(42).options[row(42).answer],/不正を実行できる環境/)
 assert.equal(row(43).options[row(43).answer],'IPsec')
 assert.equal(row(44).options[row(44).answer],'ハニーポット')
 assert.match(row(45).options[row(45).answer],/未知の欠陥や脆弱性/)
 assert.equal(row(46).options[row(46).answer],'アクティビティ図')
 assert.match(row(47).options[row(47).answer],/内部の冗長なコード/)
 assert.match(row(48).options[row(48).answer],/静的解析ツール/)
 assert.equal(2000*.04*.20*.20*200,640)
 assert.equal(row(49).options[row(49).answer],'640万円')
 assert.equal(row(50).options[row(50).answer],'Ajax')
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
 assert.match(migration,/fe-ipa-2019-spring-am-adapt-50/)
 assert.match(migration,/FE旧制度午前/)
})
