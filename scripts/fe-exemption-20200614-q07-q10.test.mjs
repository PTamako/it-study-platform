import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'

const bank=JSON.parse(readFileSync(new URL('./data/fe-exemption-20200614-q07-q10-reviewed.json',import.meta.url),'utf8'))
const migration=readFileSync(new URL('../migrations/0131_fe_exemption_20200614_q07_q10.sql',import.meta.url),'utf8')
const schema=readFileSync(new URL('../migrations/0125_fe_exemption_provenance.sql',import.meta.url),'utf8')
const first23=readFileSync(new URL('../migrations/0126_fe_ipa_exemption_first23.sql',import.meta.url),'utf8')
const pool=readFileSync(new URL('../migrations/0128_indexed_mock_draw_pool.sql',import.meta.url),'utf8')
const qurl='https://www.ipa.go.jp/shiken/about/ug65p90000001bq0-att/tokurei_Mondai_20200614_FE.pdf'
const aurl='https://www.ipa.go.jp/shiken/about/ug65p90000001bq0-att/tokurei_ans_20200614_FE.pdf'

test('two actual 2020 June IPA exemption positions are attributed to the correct official PDF and answer key',()=>{
 assert.equal(bank.version,1)
 assert.deepEqual(bank.items.map(q=>q.original_question),[7,10])
 assert.deepEqual(bank.items.map(q=>'abcd'[q.answer]),['b','a'])
 assert.deepEqual(bank.items.map(q=>q.question_pdf_page),[5,7])
 for(const q of bank.items){
  assert.equal(q.id,'fe-exempt-2020-20200614-q'+String(q.original_question).padStart(2,'0'))
  assert.equal(q.fiscal_year,2020)
  assert.equal(q.sitting_date,'2020-06-14')
  assert.equal(q.source_type,'licensed')
  assert.equal(q.exam_origin,'fe_exemption')
  assert.equal(q.source_url,qurl);assert.equal(q.answer_url,aurl)
  assert.equal(q.options.length,4)
  assert.equal(new Set(q.options).size,4)
  assert.ok(q.prompt.length>=80)
  assert.ok(q.explanation_ja.length>=70)
  assert.ok(q.explanation_zh.length>=30)
 }
})

// Independently check each text-serialized original tree, including ALL ancestors
// (not just each node's immediate children), for strict binary-search ordering.
function treeFromText(s){
 let i=0
 function node(){
  const start=i
  while(i<s.length && /[0-9]/.test(s[i]))i++
  if(start===i)throw Error('missing number at '+i)
  const value=Number(s.slice(start,i))
  let left=null,right=null
  if(s[i]==='('){
   i++;left=node()
   if(s[i++]!==',')throw Error('missing comma')
   right=node()
   if(s[i++]!==')')throw Error('missing )')
  }
  return {value,left,right}
 }
 const result=node()
 if(i!==s.length)throw Error('trailing tree syntax')
 return result
}
function isBST(node,min=-Infinity,max=Infinity){
 return !node || (node.value>min && node.value<max &&
   isBST(node.left,min,node.value)&&isBST(node.right,node.value,max))
}
test('original 2020 Q7 four diagrams are faithfully serialized and only option イ is a BST',()=>{
 const q=bank.items.find(q=>q.original_question===7)
 assert.deepEqual(q.options.map(s=>isBST(treeFromText(s))),[false,true,false,false])
 assert.equal(q.options[1],'4(2(1,3),8(6(5,7),9))')
})

test('original Q10 loops concatenate X then Y and reject the n-based offset when lengths differ',()=>{
 const q=bank.items.find(q=>q.original_question===10)
 assert.match(q.prompt,/k=1\.\.m/)
 assert.match(q.prompt,/k=1\.\.n/)
 assert.deepEqual(q.options,[
  'a: Z[k]←X[k]、b: Z[m+k]←Y[k]',
  'a: Z[k]←X[k]、b: Z[n+k]←Y[k]',
  'a: Z[k]←Y[k]、b: Z[m+k]←X[k]',
  'a: Z[k]←Y[k]、b: Z[n+k]←X[k]',
 ])
 const X=['A','B','C'],Y=['x','y'],m=X.length,n=Y.length
 const Z=Array(m+n).fill(null)
 for(let k=1;k<=m;k++)Z[k-1]=X[k-1]
 for(let k=1;k<=n;k++)Z[m+k-1]=Y[k-1]
 assert.deepEqual(Z,['A','B','C','x','y'])
 const wrong=Array(m+n).fill(null)
 for(let k=1;k<=m;k++)wrong[k-1]=X[k-1]
 for(let k=1;k<=n;k++)wrong[n+k-1]=Y[k-1]
 assert.notDeepEqual(wrong,Z)
})

test('new 2 source positions, 23 old canonical problems and all user history survive reapplication',()=>{
 const db=new DatabaseSync(':memory:')
 try{
  db.exec(`PRAGMA foreign_keys=ON;
   CREATE TABLE questions(
     id TEXT PRIMARY KEY, track_id TEXT NOT NULL, topic TEXT, difficulty TEXT, question_type TEXT,
     prompt TEXT, options_json TEXT, answer_json TEXT, explanation TEXT,
     source_type TEXT NOT NULL, source_reference TEXT, language TEXT,
     exam_section TEXT, exam_section_method TEXT,
     question_kind TEXT NOT NULL DEFAULT 'standard'
   );
   CREATE TABLE study_attempts(id TEXT PRIMARY KEY,question_id TEXT);
   CREATE TABLE question_review_state(question_id TEXT PRIMARY KEY,mastered INTEGER);
   INSERT INTO questions(id,track_id,topic,prompt,source_type) VALUES
     ('keep-personal','exam-fe','original','no modification','personal');
   INSERT INTO study_attempts VALUES ('old-answer','keep-personal');
   INSERT INTO question_review_state VALUES ('keep-personal',1);`)
  db.exec(schema)
  db.exec(first23)
  db.exec(pool)
  db.exec(migration)
  const scalar=(sql)=>db.prepare(sql).get().n
  assert.equal(scalar("SELECT COUNT(*) AS n FROM questions WHERE exam_origin='fe_exemption'"),25)
  assert.equal(scalar('SELECT COUNT(*) AS n FROM fe_exemption_occurrences'),26)
  assert.equal(scalar("SELECT COUNT(*) AS n FROM fe_exemption_occurrences WHERE sitting_date='2020-06-14'"),10)
  assert.equal(scalar("SELECT COUNT(*) AS n FROM mock_question_pool WHERE exam_origin='fe_exemption'"),25)
  for(const row of db.prepare("SELECT * FROM questions WHERE id IN ('fe-exempt-2020-20200614-q07','fe-exempt-2020-20200614-q10')").all()){
   assert.equal(row.exam_section,'A');assert.equal(row.exam_section_method,'explicit')
   assert.equal(row.question_kind,'standard')
   assert.equal(row.source_type,'licensed');assert.equal(row.source_reference,qurl)
   assert.equal(row.exam_origin,'fe_exemption')
   assert.match(row.explanation,/中文解析/)
   assert.match(row.prompt,/図表文字化／改編/)
   assert.equal(JSON.parse(row.options_json).length,4)
  }
  db.exec(migration)
  assert.equal(scalar("SELECT COUNT(*) AS n FROM questions WHERE exam_origin='fe_exemption'"),25)
  assert.equal(scalar('SELECT COUNT(*) AS n FROM fe_exemption_occurrences'),26)
  assert.equal(scalar("SELECT COUNT(*) AS n FROM study_attempts"),1)
  assert.equal(db.prepare("SELECT mastered FROM question_review_state WHERE question_id='keep-personal'").get().mastered,1)
  assert.equal(db.prepare("SELECT prompt FROM questions WHERE id='keep-personal'").get().prompt,'no modification')
 }finally{db.close()}
})

test('migration only inserts and cannot falsely relabel 2020 CBT nonpublic exams',()=>{
 assert.equal((migration.match(/INSERT OR IGNORE INTO questions/g)||[]).length,2)
 assert.equal((migration.match(/INSERT OR IGNORE INTO fe_exemption_occurrences/g)||[]).length,2)
 assert.doesNotMatch(migration,/DROP TABLE|DELETE FROM|UPDATE questions|REPLACE INTO/i)
 assert.match(migration,/通常CBT本試験ではありません/)
})
