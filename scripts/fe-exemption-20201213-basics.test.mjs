import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'

const file = name => readFileSync(new URL(`../migrations/${name}`,import.meta.url),'utf8')
test('2020 basic questions and repeated 2022 sittings preserve official keys and existing records',()=>{
  const db=new DatabaseSync(':memory:')
  try {
    db.exec(`PRAGMA foreign_keys=ON;
      CREATE TABLE questions(id TEXT PRIMARY KEY,track_id TEXT NOT NULL,topic TEXT,difficulty TEXT,
       question_type TEXT,prompt TEXT,options_json TEXT,answer_json TEXT,explanation TEXT,
       source_type TEXT NOT NULL,source_reference TEXT,language TEXT,exam_section TEXT,
       exam_section_method TEXT,question_kind TEXT NOT NULL DEFAULT 'standard');
      CREATE TABLE study_attempts(id TEXT PRIMARY KEY,question_id TEXT);
      INSERT INTO questions(id,track_id,topic,prompt,source_type) VALUES ('existing','exam-fe','keep','unchanged','personal');
      INSERT INTO study_attempts VALUES ('attempt','existing');`)
    db.exec(file('0125_fe_exemption_provenance.sql'));db.exec(file('0128_indexed_mock_draw_pool.sql'))
    const migration=file('0157_fe_exemption_20201213_basics.sql');db.exec(migration);db.exec(migration)
    const rows=db.prepare(`SELECT o.sitting_date,o.original_question,o.official_answer,o.canonical_question_id,
      q.answer_json,q.options_json,q.explanation FROM fe_exemption_occurrences o
      JOIN questions q ON q.id=o.canonical_question_id ORDER BY o.sitting_date,o.original_question`).all()
    assert.deepEqual(rows.map(r=>[r.sitting_date,r.original_question,r.official_answer]),[
      ['2020-12-13',3,'c'],['2020-12-13',5,'b'],['2020-12-13',6,'a'],['2020-12-13',7,'b'],
      ['2020-12-13',9,'b'],['2020-12-13',10,'c'],['2020-12-13',11,'c'],['2020-12-13',13,'d'],
      ['2020-12-13',14,'d'],['2020-12-13',15,'a'],['2020-12-13',16,'d'],
      ['2022-07-24',10,'b'],['2022-07-24',15,'d']])
    assert.equal(rows[4].canonical_question_id,rows[11].canonical_question_id)
    assert.equal(rows[10].canonical_question_id,rows[12].canonical_question_id)
    for(const row of rows){assert.equal(JSON.parse(row.answer_json),row.official_answer);assert.equal(JSON.parse(row.options_json).length,4);assert.match(row.explanation,/中文解析/);assert.doesNotMatch(row.explanation,/\\n/)}
    assert.equal(db.prepare("SELECT COUNT(*) AS n FROM mock_question_pool WHERE exam_origin='fe_exemption'").get().n,11)
    assert.equal(db.prepare("SELECT prompt FROM questions WHERE id='existing'").get().prompt,'unchanged')
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM study_attempts').get().n,1)
    assert.doesNotMatch(migration,/\b(?:DELETE|UPDATE|REPLACE|DROP)\b/i)
  }finally{db.close()}
})

test('source calculations for mean code length and GCD',()=>{
  assert.equal([1,2,3,4,4].reduce((sum,n,i)=>sum+n*[50,30,10,5,5][i],0)/100,1.8)
  const gcd=(a,b)=>b===0?a:gcd(b,a%b)
  assert.equal(gcd(231,15),3)
})
