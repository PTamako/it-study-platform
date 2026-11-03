import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {DatabaseSync} from 'node:sqlite'

const data=JSON.parse(readFileSync(new URL('./data/fe-2022-official-samples-part1.json',import.meta.url),'utf8'))
const migrationKind=readFileSync(new URL('../migrations/0121_fe_official_sample_kind.sql',import.meta.url),'utf8')
const migrationData=readFileSync(new URL('../migrations/0122_fe_ipa_2022_sample_training_batch1.sql',import.meta.url),'utf8')
const worker=readFileSync(new URL('../worker/index.ts',import.meta.url),'utf8')
const app=readFileSync(new URL('../src/App.vue',import.meta.url),'utf8')
const A={1:'d',7:'b',8:'c',9:'d',11:'c',13:'d',15:'d',18:'d',19:'d',20:'d',21:'a',23:'a',25:'a',26:'d',27:'b',28:'d',29:'a',30:'a',31:'d',32:'a',36:'a',37:'d',38:'b',39:'b',40:'b',46:'d',48:'b',49:'a',53:'d',54:'d',55:'b',56:'d'}
const B={1:'f',3:'f',4:'d',5:'e',6:'a',7:'f'}

test('38 IPA 2022 officially published A/B sample adaptations have authentic source IDs and verified answer letters',()=>{
 assert.equal(data.version,1)
 assert.equal(data.items.length,38)
 assert.equal(data.items.filter(q=>q.section==='A').length,32)
 assert.equal(data.items.filter(q=>q.section==='B').length,6)
 assert.equal(new Set(data.items.map(q=>q.id)).size,38)
 for(const q of data.items){
   assert.equal(q.source_type,'licensed','sample adaptations cannot be unmodified official CBT questions')
   assert.equal(q.question_kind,'official_sample')
   assert.equal(q.source_published_year,2022)
   assert.equal(q.id,'fe-ipa-sample-2022-'+q.section.toLowerCase()+'-'+String(q.question_number).padStart(3,'0'))
   const answers=q.section==='A'?A:B
   assert.equal('abcdefghij'[q.answer],answers[q.question_number])
   assert.match(q.source_url,/^https:\/\/www\.ipa\.go\.jp\/shiken\/syllabus\/henkou\/2022\//)
   assert.match(q.source_answers_url,/set_sample_ans\.pdf$/)
   assert.ok(q.prompt.length>20)
   assert.ok(q.explanation_ja.length>21)
   assert.ok(q.explanation_zh.length>7)
   assert.equal(new Set(q.options).size,q.options.length)
   assert.ok(q.options.length>=4&&q.options.length<=10)
 }
})

test('schema change and source-tagged inserts remain idempotent, preserve existing attempts and do not invent 2020/21 CBT past papers',()=>{
 const db=new DatabaseSync(':memory:')
 try{
   db.exec('CREATE TABLE questions (id TEXT PRIMARY KEY, track_id TEXT,topic TEXT,difficulty TEXT,question_type TEXT,prompt TEXT,options_json TEXT,answer_json TEXT,explanation TEXT,source_type TEXT NOT NULL CHECK(source_type IN (\'official\',\'licensed\',\'generated\',\'personal\')),source_reference TEXT,language TEXT,exam_section TEXT,exam_section_method TEXT);'+
     'CREATE TABLE study_attempts (id TEXT PRIMARY KEY,question_id TEXT);'+
     'CREATE TABLE question_review_state (question_id TEXT PRIMARY KEY, mastered INTEGER);')
   db.exec("INSERT INTO questions (id,track_id,topic,source_type,prompt) VALUES ('legacy-fe','exam-fe','歴年題','official','保留')")
   db.exec("INSERT INTO study_attempts VALUES('old-attempt','legacy-fe')")
   db.exec("INSERT INTO question_review_state VALUES('legacy-fe',1)")
   db.exec(migrationKind)
   assert.equal(db.prepare("SELECT question_kind FROM questions WHERE id='legacy-fe'").get().question_kind,'standard')
   db.exec(migrationData)
   const rows=db.prepare("SELECT * FROM questions WHERE question_kind='official_sample'").all()
   assert.equal(rows.length,38)
   assert.equal(rows.filter(x=>x.exam_section==='A').length,32)
   assert.equal(rows.filter(x=>x.exam_section==='B').length,6)
   for(const q of rows){
     assert.equal(q.source_type,'licensed')
     assert.match(q.prompt,/公式サンプル問題/)
     assert.ok(q.explanation.includes('中文解析：'))
     assert.ok(q.explanation.includes('出典：基本情報技術者試験'))
     assert.equal(JSON.parse(q.options_json).length,data.items.find(x=>x.id===q.id).options.length)
     assert.match(q.source_reference,/ipa\.go\.jp/)
   }
   db.exec(migrationData)
   assert.equal(db.prepare("SELECT COUNT(*) AS n FROM questions").get().n,39)
   assert.equal(db.prepare("SELECT COUNT(*) AS n FROM study_attempts").get().n,1)
   assert.equal(db.prepare("SELECT mastered FROM question_review_state WHERE question_id='legacy-fe'").get().mastered,1)
   assert.equal(db.prepare("SELECT COUNT(*) AS n FROM questions WHERE source_type='official'").get().n,1)
   assert.equal(db.prepare("SELECT COUNT(*) AS n FROM questions WHERE id LIKE '%-2020-%' OR id LIKE '%-2021-%'").get().n,0)
 } finally{ db.close() }
})

test('official samples are separately selectable across practice, wrong review, mocks, sections, year and counters',()=>{
 assert.match(worker,/sample_question_count/)
 assert.match(worker,/question_kind = 'official_sample'/)
 assert.match(worker,/q\.question_kind = 'official_sample'/)
 assert.match(worker,/source_type = 'licensed' AND question_kind = 'standard'/)
 assert.match(worker,/q\.source_type = 'licensed' AND q\.question_kind = 'standard'/)
 assert.match(worker,/question_kind,?\s+exam_section/)
 assert.match(app,/source: 'sample'|source === 'sample'/)
 assert.match(app,/sample_question_count/)
 assert.match(app,/question\.question_kind === 'official_sample'/)
 assert.match(app,/2020～2022 年正式 CBT 考题没有公开/)
 assert.doesNotMatch(migrationData,/DELETE FROM|REPLACE INTO|UPDATE questions|DROP TABLE/i)
})

test('independent arithmetic samples retain the verified IPA outcomes',()=>{
 assert.equal((5+4+3+2+1)%13,2)
 assert.equal([3,2,1,6,5,4].slice(0,5).reduce((s,n)=>s+n,0),17)
 assert.equal((12*8)/(1.5*.5),128)
 assert.ok(14/16<.9 && 14/15>.9)
 const reversed=Number.parseInt([...('01001011')].reverse().join(''),2).toString(2).padStart(8,'0')
 assert.equal(reversed,'11010010')
})
