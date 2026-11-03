import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {DatabaseSync} from 'node:sqlite'

const readJSON=name=>JSON.parse(readFileSync(new URL('./data/'+name,import.meta.url),'utf8'))
const old=readJSON('fe-2022-official-samples-part1.json').items
const a=readJSON('fe-2022-official-samples-a-remaining28.json').items
const b=readJSON('fe-2022-official-samples-b-remaining14.json').items
const april=readJSON('fe-2022-official-samples-april-b6.json').items
const records=[...old,...a,...b,...april]
const sql121=readFileSync(new URL('../migrations/0121_fe_official_sample_kind.sql',import.meta.url),'utf8')
const sql122=readFileSync(new URL('../migrations/0122_fe_ipa_2022_sample_training_batch1.sql',import.meta.url),'utf8')
const sql123=readFileSync(new URL('../migrations/0123_fe_ipa_2022_sample_completion.sql',import.meta.url),'utf8')
const decA={2:'d',3:'d',4:'a',5:'b',6:'d',10:'c',12:'b',14:'d',16:'a',17:'d',22:'b',24:'b',33:'c',34:'c',35:'b',41:'c',42:'d',43:'c',44:'d',45:'b',47:'d',50:'a',51:'d',52:'a',57:'c',58:'b',59:'b',60:'c'}
const decB={2:'c',8:'d',9:'c',10:'f',11:'a',12:'d',13:'c',14:'h',15:'a',16:'h',17:'f',18:'d',19:'d',20:'f'}
const aprB={1:'f',2:'c',3:'a',4:'b',5:'c',6:'e'}

test('2022-12-26 IPA public samples cover all 60 subject A and 20 subject B, plus distinct 2022-04 B6',()=>{
 assert.equal(old.length,38);assert.equal(a.length,28);assert.equal(b.length,14);assert.equal(april.length,6)
 assert.equal(records.length,86)
 assert.equal(new Set(records.map(x=>x.id)).size,86)
 assert.deepEqual([...new Set([...old,...a].filter(x=>x.section==='A').map(x=>x.question_number))].sort((x,y)=>x-y),
   Array.from({length:60},(_,i)=>i+1))
 assert.deepEqual([...new Set([...old,...b].filter(x=>x.section==='B').map(x=>x.question_number))].sort((x,y)=>x-y),
   Array.from({length:20},(_,i)=>i+1))
 assert.deepEqual(april.map(x=>x.question_number),[1,2,3,4,5,6])
 for(const row of records){
   assert.equal(row.source_type,'licensed')
   assert.equal(row.question_kind,'official_sample')
   assert.equal(row.source_published_year,2022)
   assert.ok(row.source_url.startsWith('https://www.ipa.go.jp/'))
   assert.ok(row.source_answers_url.startsWith('https://www.ipa.go.jp/'))
   assert.ok(row.options.length>=4&&row.options.length<=10)
   assert.equal(new Set(row.options).size,row.options.length)
   assert.ok(Number.isInteger(row.answer)&&row.answer>=0&&row.answer<row.options.length)
   assert.ok(row.explanation_ja.length>=21)
   assert.ok(row.explanation_zh.length>=10)
   if(april.includes(row)) assert.equal('abcdefghij'[row.answer],aprB[row.question_number])
   if(a.includes(row)) assert.equal('abcdefghij'[row.answer],decA[row.question_number])
   if(b.includes(row)) assert.equal('abcdefghij'[row.answer],decB[row.question_number])
 }
})

test('April 2022 PaaS question 6 is not the same as December 2022 B17 despite shared topic',()=>{
 const q1=april.find(x=>x.question_number===6)
 const q2=b.find(x=>x.question_number===17)
 assert.notEqual(q1.id,q2.id)
 assert.notEqual(q1.prompt,q2.prompt)
 assert.notEqual(q1.source_url,q2.source_url)
 assert.notEqual(q1.options[q1.answer],q2.options[q2.answer])
})

test('source metadata and 48-row follow-up D1 migration are additive and idempotent',()=>{
 assert.match(sql123,/INSERT OR IGNORE INTO questions/)
 assert.doesNotMatch(sql123,/REPLACE INTO|DELETE FROM|DROP TABLE|UPDATE questions/i)
 const db=new DatabaseSync(':memory:')
 try{
  db.exec("CREATE TABLE questions (id TEXT PRIMARY KEY,track_id TEXT,topic TEXT,difficulty TEXT,question_type TEXT,prompt TEXT,options_json TEXT,answer_json TEXT,explanation TEXT,source_type TEXT NOT NULL CHECK(source_type IN ('official','licensed','generated','personal')),source_reference TEXT,language TEXT,exam_section TEXT,exam_section_method TEXT);"+
    "CREATE TABLE study_attempts(id TEXT PRIMARY KEY,question_id TEXT);"+
    "CREATE TABLE question_review_state(question_id TEXT PRIMARY KEY,mastered INTEGER);")
  db.exec("INSERT INTO questions(id,track_id,topic,prompt,source_type) VALUES('legacy-fe','exam-fe','旧問題','変更禁止','official')")
  db.exec("INSERT INTO study_attempts VALUES('attempt-1','legacy-fe')")
  db.exec("INSERT INTO question_review_state VALUES('legacy-fe',1)")
  db.exec(sql121);db.exec(sql122);db.exec(sql123)
  const total=db.prepare("SELECT COUNT(*) AS n FROM questions WHERE question_kind='official_sample'").get().n
  assert.equal(total,86)
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM questions WHERE question_kind='official_sample' AND exam_section='A'").get().n,60)
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM questions WHERE question_kind='official_sample' AND exam_section='B'").get().n,26)
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM questions WHERE id LIKE 'fe-ipa-sample-2022-april-b-%'").get().n,6)
  for(const q of db.prepare("SELECT * FROM questions WHERE question_kind='official_sample'").all()){
    assert.equal(q.track_id,'exam-fe');assert.equal(q.exam_section_method,'explicit');assert.equal(q.source_type,'licensed')
    assert.match(q.prompt,/IPA 2022年公開・公式サンプル問題/)
    assert.match(q.prompt,/改編/)
    assert.match(q.explanation,/中文解析/)
    assert.match(q.explanation,/実試験のCBT過去問ではありません|学習用改編/)
    assert.ok(q.source_reference.startsWith('https://www.ipa.go.jp/'))
    const opts=JSON.parse(q.options_json),ans=JSON.parse(q.answer_json)
    assert.ok(opts.some(o=>o.id===ans))
  }
  db.exec(sql123)
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM questions").get().n,87)
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM study_attempts").get().n,1)
  assert.equal(db.prepare("SELECT mastered FROM question_review_state WHERE question_id='legacy-fe'").get().mastered,1)
  assert.equal(db.prepare("SELECT prompt FROM questions WHERE id='legacy-fe'").get().prompt,'変更禁止')
 } finally{db.close()}
})

test('critical calculation and traversal adaptations are internally consistent',()=>{
 // Subject A: cache A15, D17, B30, C40.
 const times={A:15,B:30,C:.6*20+.4*70,D:.9*10+.1*80}
 assert.deepEqual(Object.keys(times).sort((a,b)=>times[a]-times[b]),['A','D','B','C'])
 assert.equal(100*40+150*20,7000)
 assert.equal((30-30*.25*3)-1,6.5)
 assert.equal((30+18)/.4,120)
 // Subject B: quantile positions 1,4,6,8,10 (1-indexed).
 assert.deepEqual([0,.25,.5,.75,1].map(p=>Math.ceil(p*9)+1),[1,4,6,8,10])
})
