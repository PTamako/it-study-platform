import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {DatabaseSync} from 'node:sqlite'

const document=JSON.parse(readFileSync(new URL('./data/fe-ipa-2019-spring-07-27-reviewed.json',import.meta.url),'utf8'))
const migration=readFileSync(new URL('../migrations/0120_fe_ipa_2019_spring_morning_07_27.sql',import.meta.url),'utf8')
const expected={7:'d',8:'a',9:'c',10:'b',11:'d',12:'c',13:'d',14:'d',
  15:'d',16:'b',17:'a',18:'d',19:'a',20:'d',21:'d',22:'b',23:'a',24:'c',
  25:'c',26:'b',27:'b'}
const source="https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000ddiw-att/2019h31h_fe_am_qs.pdf"
const answerSheet="https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000ddiw-att/2019h31h_fe_am_ans.pdf"

test('21 source-verified former morning questions have correct original item numbers and IPA answers',()=>{
  assert.equal(document.version,1)
  assert.equal(document.items.length,21)
  assert.deepEqual(document.items.map(x=>x.original_number),Array.from({length:21},(_,i)=>i+7))
  assert.equal(new Set(document.items.map(x=>x.id)).size,21)
  assert.equal(new Set(document.items.map(x=>x.prompt)).size,21)
  for(const row of document.items){
    assert.equal(row.id,'fe-ipa-2019-spring-am-adapt-'+String(row.original_number).padStart(2,'0'))
    assert.equal(row.year,2019)
    assert.equal(row.exam,'FE')
    assert.equal(row.original_section,'午前')
    assert.equal(row.current_section,'A')
    assert.equal(row.source_type,'licensed','do not call adaptations unmodified official originals')
    assert.equal(row.source_reference,source)
    assert.equal(row.official_answer_reference,answerSheet)
    assert.ok(row.pdf_page>=6&&row.pdf_page<=13)
    assert.equal('abcd'[row.answer],expected[row.original_number])
    assert.equal(row.options.length,4)
    assert.equal(new Set(row.options).size,4)
    assert.ok(row.explanation_ja.length>=27)
    assert.ok(row.explanation_zh.length>=14)
    assert.ok(row.adaptation)
  }
})

test('independent calculations reproduce IPA answers for GCD chart, cache and audio questions',()=>{
  let L=876,S=204,comparisons=0
  do { comparisons++;if(L===S)break;if(L>S)L-=S;else S-=L } while(comparisons<100)
  assert.equal(comparisons,11)
  assert.equal(document.items.find(x=>x.original_number===7).options[
    document.items.find(x=>x.original_number===7).answer],'11回')
  const times={A:15,B:30,C:.6*20+.4*70,D:.9*10+.1*80}
  assert.deepEqual(Object.keys(times).sort((a,b)=>times[a]-times[b]),['A','D','B','C'])
  const reliability=a=>a*(1-(1-.8)**3)*(1-(1-.9)**2)
  assert.ok(reliability(.95)<.95&&reliability(.95)>.93)
  assert.equal(Math.floor(512e6/(11000*1*60)),775)
  assert.equal(document.items.find(x=>x.original_number===25).options[
    document.items.find(x=>x.original_number===25).answer],'775分')
})

test('import is idempotent and retains old exam attempts/mastery and official originals',()=>{
 const db=new DatabaseSync(':memory:')
 try{
   db.exec('CREATE TABLE questions(id TEXT PRIMARY KEY,track_id TEXT,topic TEXT,'+
     'difficulty TEXT,question_type TEXT,prompt TEXT,options_json TEXT,'+
     'answer_json TEXT,explanation TEXT,source_type TEXT,source_reference TEXT,'+
     'language TEXT,exam_section TEXT,exam_section_method TEXT);'+
     'CREATE TABLE study_attempts(id TEXT PRIMARY KEY,question_id TEXT,user_answer_json TEXT);'+
     'CREATE TABLE question_review_state(question_id TEXT PRIMARY KEY,mastered INTEGER);')
   db.exec("INSERT INTO questions (id,track_id,topic,prompt,source_type,exam_section) VALUES ('fe-ipa-official-2019-spring-a-01','exam-fe','既存','過去問1','official','A')")
   db.exec("INSERT INTO study_attempts VALUES('past-01','fe-ipa-official-2019-spring-a-01','\"c\"')")
   db.exec("INSERT INTO question_review_state VALUES('fe-ipa-official-2019-spring-a-01',1)")
   db.exec(migration)
   const count=where=>db.prepare('SELECT COUNT(*) AS n FROM questions WHERE '+where).get().n
   assert.equal(count("track_id='exam-fe'"),22)
   assert.equal(count("source_type='licensed'"),21)
   assert.equal(count("source_type='official'"),1)
   for(const row of db.prepare("SELECT * FROM questions WHERE id LIKE 'fe-ipa-2019-spring-am-adapt-%'").all()){
      assert.equal(row.source_reference,source)
      assert.equal(row.exam_section,'A')
      assert.equal(row.exam_section_method,'explicit')
      assert.equal(row.source_type,'licensed')
      assert.match(row.prompt,/旧制度午前 問\d+・改編/)
      assert.match(row.explanation,/中文解析/)
      assert.match(row.explanation,/出典：IPA 2019年度/)
      assert.equal(JSON.parse(row.options_json).length,4)
      assert.ok(['a','b','c','d'].includes(JSON.parse(row.answer_json)))
   }
   db.exec(migration)
   assert.equal(count("track_id='exam-fe'"),22)
   assert.equal(db.prepare("SELECT mastered FROM question_review_state WHERE question_id='fe-ipa-official-2019-spring-a-01'").get().mastered,1)
   assert.equal(db.prepare('SELECT COUNT(*) AS n FROM study_attempts').get().n,1)
 } finally {db.close()}
})

test('only adds IPA-source adaptations, not fictitious CBT originals or legacy afternoon B',()=>{
 assert.match(migration,/INSERT OR IGNORE INTO questions/)
 assert.doesNotMatch(migration,/DELETE FROM|DROP TABLE|REPLACE INTO/i)
 assert.doesNotMatch(migration,/'official'|exam_section_method.*'inferred'/i)
 assert.match(migration,/fe-ipa-2019-spring-am-adapt-27/)
 assert.match(migration,/https:\/\/www\.ipa\.go\.jp/)
})
