import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import {feGrowthAlgorithmQuestions} from './fe-growth1-algorithm-bank.mjs'

const a=JSON.parse(readFileSync(new URL('./data/fe-growth1-subject-a.json',import.meta.url),'utf8')).items
const sec=JSON.parse(readFileSync(new URL('./data/fe-growth1-subject-b-security.json',import.meta.url),'utf8')).items
const migration=readFileSync(new URL('../migrations/0119_fe_growth_phase1_original_80.sql',import.meta.url),'utf8')
const bank=[...a,...feGrowthAlgorithmQuestions,...sec]

test('FE phase one adds exactly 80 distinguishable original A/B questions, not invented published items',()=>{
  assert.equal(a.length,30)
  assert.equal(feGrowthAlgorithmQuestions.length,40)
  assert.equal(sec.length,10)
  assert.equal(bank.length,80)
  const ids=new Set(),prompts=new Set(),topics=new Set()
  const algorithmTemplates=new Map()
  for(const q of bank){
    assert.ok(!ids.has(q.id),'duplicate ID '+q.id);ids.add(q.id)
    const body=q.prompt.normalize('NFKC').replace(/\s+/g,'').toLowerCase()
    assert.ok(!prompts.has(body),'duplicate prompt '+q.id);prompts.add(body)
    topics.add(q.topic)
    assert.match(q.id,/^fe-growth1-(a-\d{3}|b-algo-\d{3}|b-security-\d{3})$/)
    assert.ok(['A','B'].includes(q.section))
    assert.ok(q.prompt.length>23)
    assert.ok(q.explanation.length>=27)
    assert.equal(q.options.length,4)
    assert.equal(new Set(q.options).size,4)
    assert.equal(Number.isInteger(q.answer),true)
    assert.ok(q.answer>=0&&q.answer<4)
    if(q.section==='B')assert.ok(q.prompt.length>75)
    if(q.id.includes('b-algo-')){
      assert.match(q.prompt,/\n/,'algorithms must have traceable pseudocode')
      algorithmTemplates.set(q.template,(algorithmTemplates.get(q.template)||0)+1)
    }
  }
  assert.ok(topics.size>=18)
  assert.equal(algorithmTemplates.size,20)
  for(const count of algorithmTemplates.values())assert.equal(count,2)
})

test('independent hand-calculated algorithm regression answers match each generated correct option',()=>{
  // Numeric and string results independently derived from pseudocode examples.
  const expected=[
    18,24,16,16,3,2,6,6,40,9,8,5,7,2,
    'A3B2C4D1','K2L3M4N2',1,0,4,4,3,3,15,36,15,13,31,127,
    6,4,4,5,4,5,9,8,1,2,3,4
  ]
  assert.equal(expected.length,40)
  for(let i=0;i<40;i++){
    const q=feGrowthAlgorithmQuestions[i]
    assert.equal(q.options[q.answer],String(expected[i]),'wrong computed answer for '+q.id)
  }
})

test('migration only inserts explicitly generated exercises and never overwrites existing progress',()=>{
  const db=new DatabaseSync(':memory:')
  try{
    db.exec("CREATE TABLE questions (id TEXT PRIMARY KEY, track_id TEXT,topic TEXT,difficulty TEXT,question_type TEXT,prompt TEXT,options_json TEXT,answer_json TEXT,explanation TEXT,source_type TEXT,source_reference TEXT,language TEXT,exam_section TEXT,exam_section_method TEXT)")
    db.exec("CREATE TABLE study_attempts (id TEXT PRIMARY KEY,question_id TEXT,user_answer_json TEXT)")
    db.exec("CREATE TABLE question_review_state (question_id TEXT PRIMARY KEY,mastered INTEGER)")
    db.exec("INSERT INTO questions (id,track_id,topic,prompt,source_type,exam_section) VALUES ('legacy-fe','exam-fe','テスト','既存の演習','official','A')")
    db.exec("INSERT INTO study_attempts VALUES ('attempt-legacy','legacy-fe','\"a\"')")
    db.exec("INSERT INTO question_review_state VALUES ('legacy-fe',1)")
    db.exec(migration)
    const count=filter=>db.prepare("SELECT COUNT(*) AS n FROM questions WHERE "+filter).get().n
    assert.equal(count("track_id='exam-fe'"),81)
    assert.equal(count("source_type='generated'"),80)
    assert.equal(count("exam_section='A'"),31)
    assert.equal(count("exam_section='B'"),50)
    assert.equal(count("topic='FE算法与程序设计'"),40)
    assert.equal(count("topic='FE信息安全'"),10)
    assert.equal(count("source_type='official'"),1)
    for(const row of db.prepare("SELECT * FROM questions WHERE id LIKE 'fe-growth1-%'").all()){
      assert.equal(row.track_id,'exam-fe')
      assert.equal(row.source_type,'generated')
      assert.match(row.source_reference,/IPA公式過去問ではありません/)
      assert.equal(row.exam_section_method,'explicit')
      const opts=JSON.parse(row.options_json)
      assert.equal(opts.length,4)
      const answer=JSON.parse(row.answer_json)
      assert.ok(opts.some(o=>o.id===answer))
      assert.ok(row.explanation.length>=27)
    }
    db.exec(migration)
    assert.equal(count("track_id='exam-fe'"),81)
    assert.equal(db.prepare("SELECT mastered FROM question_review_state WHERE question_id='legacy-fe'").get().mastered,1)
    assert.equal(db.prepare("SELECT COUNT(*) AS n FROM study_attempts").get().n,1)
  } finally{db.close()}
})

test('migration is additive and never attempts to reclassify old exam sources',()=>{
  assert.match(migration,/INSERT OR IGNORE INTO questions/)
  assert.doesNotMatch(migration,/\b(DELETE FROM|DROP TABLE|UPDATE questions|REPLACE INTO)\b/i)
  assert.match(migration,/fe-growth1-b-security-010/)
  assert.match(migration,/fe-growth1-b-algo-040/)
  assert.match(migration,/fe-growth1-a-030/)
  assert.doesNotMatch(migration,/source_type\s*=\s*'official'/)
})
