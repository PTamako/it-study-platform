import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'

test('2021 systems questions import idempotently without changing existing study state', () => {
  const db = new DatabaseSync(':memory:')
  try {
    db.exec(`PRAGMA foreign_keys=ON;
      CREATE TABLE questions(id TEXT PRIMARY KEY,track_id TEXT,topic TEXT,difficulty TEXT,question_type TEXT,prompt TEXT,options_json TEXT,answer_json TEXT,explanation TEXT,source_type TEXT,source_reference TEXT,language TEXT,exam_section TEXT,exam_section_method TEXT,question_kind TEXT,exam_origin TEXT);
      CREATE TABLE fe_exemption_occurrences(sitting_date TEXT,original_question INTEGER,fiscal_year TEXT,canonical_question_id TEXT REFERENCES questions(id),official_answer TEXT,question_url TEXT,answer_url TEXT,PRIMARY KEY(sitting_date,original_question));
      CREATE TABLE study_attempts(id TEXT PRIMARY KEY,question_id TEXT REFERENCES questions(id));
      CREATE TABLE question_review_state(question_id TEXT PRIMARY KEY REFERENCES questions(id),mastered INTEGER);
      INSERT INTO questions(id) VALUES('prior'); INSERT INTO study_attempts VALUES('attempt','prior'); INSERT INTO question_review_state VALUES('prior',1);`)
    const sql = readFileSync(new URL('../migrations/0163_fe_exemption_20210613_systems.sql',import.meta.url),'utf8')
    db.exec(sql); db.exec(sql)
    const rows=db.prepare('SELECT o.original_question,o.official_answer,q.answer_json,q.options_json FROM fe_exemption_occurrences o JOIN questions q ON q.id=o.canonical_question_id ORDER BY o.sitting_date,o.original_question').all()
    assert.deepEqual(rows.map(r=>[r.original_question,r.official_answer]),[[10,'b'],[11,'d'],[12,'b'],[13,'c'],[14,'a'],[15,'a'],[16,'d'],[17,'c'],[18,'d'],[19,'c'],[20,'b'],[21,'c'],[13,'b'],[19,'c']])
    for(const r of rows) { assert.equal(JSON.parse(r.answer_json),r.official_answer);assert.equal(JSON.parse(r.options_json).length,4) }
    assert.equal(db.prepare('SELECT COUNT(*) n FROM study_attempts').get().n,1)
    assert.equal(db.prepare('SELECT mastered FROM question_review_state').get().mastered,1)
    assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(),[])
  } finally { db.close() }
})

test('address width and parallel availability follow from the original values', () => {
  assert.equal(2 ** 20, 1024 * 1024)
  assert.ok(Math.abs((1 - (1 - 480 / 500) * (1 - 950 / 1000)) * 100 - 99.8) < 1e-9)
})

test('the three NAND gates implement OR', () => {
  for (const x of [false,true]) for (const y of [false,true]) assert.equal(!(!(x && x) && !(y && y)), x || y)
})

test('instruction rate, effective address, and repeated subtraction are correct', () => {
 assert.equal(1 / (20e-9) / 1e6, 50)
 assert.equal(({300:1300})[200+100],1300)
 for(const x of [1,7,11,30]) for(const y of [1,2,3,8]) { let q=0,r=x; while(r>=y){r-=y;q++} assert.equal(q,Math.floor(x/y));assert.equal(r,x%y) }
})
