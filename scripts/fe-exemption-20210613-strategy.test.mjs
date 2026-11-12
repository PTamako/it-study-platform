import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'

test('2021 strategy questions import idempotently without changing existing study state', () => {
  const db = new DatabaseSync(':memory:')
  try {
    db.exec(`PRAGMA foreign_keys=ON;
      CREATE TABLE questions(id TEXT PRIMARY KEY,track_id TEXT,topic TEXT,difficulty TEXT,question_type TEXT,prompt TEXT,options_json TEXT,answer_json TEXT,explanation TEXT,source_type TEXT,source_reference TEXT,language TEXT,exam_section TEXT,exam_section_method TEXT,question_kind TEXT,exam_origin TEXT);
      CREATE TABLE fe_exemption_occurrences(sitting_date TEXT,original_question INTEGER,fiscal_year TEXT,canonical_question_id TEXT REFERENCES questions(id),official_answer TEXT,question_url TEXT,answer_url TEXT,PRIMARY KEY(sitting_date,original_question));
      CREATE TABLE study_attempts(id TEXT PRIMARY KEY,question_id TEXT REFERENCES questions(id));
      CREATE TABLE question_review_state(question_id TEXT PRIMARY KEY REFERENCES questions(id),mastered INTEGER);
      INSERT INTO questions(id) VALUES('prior'); INSERT INTO questions(id,answer_json,options_json) VALUES('fe-ipa-official-2024-a-11','"c"','[1,2,3,4]'); INSERT INTO study_attempts VALUES('attempt','prior'); INSERT INTO question_review_state VALUES('prior',1);`)
    const sql = readFileSync(new URL('../migrations/0169_fe_exemption_20210613_strategy.sql',import.meta.url),'utf8')
    db.exec(sql); db.exec(sql)
    const rows=db.prepare('SELECT o.original_question,o.official_answer,q.answer_json,q.options_json FROM fe_exemption_occurrences o JOIN questions q ON q.id=o.canonical_question_id ORDER BY o.sitting_date,o.original_question').all()
    assert.deepEqual(rows.map(r=>[r.original_question,r.official_answer]),[[47,'c'],[61,'c'],[62,'c'],[64,'a'],[65,'c'],[66,'c'],[67,'b'],[68,'c'],[69,'a'],[70,'a'],[72,'c'],[73,'b'],[75,'c'],[76,'b'],[77,'c'],[79,'d'],[80,'a']])
    for(const r of rows) { assert.equal(JSON.parse(r.answer_json),r.official_answer);assert.equal(JSON.parse(r.options_json).length,4) }
    assert.equal(db.prepare('SELECT COUNT(*) n FROM study_attempts').get().n,1)
    assert.equal(db.prepare('SELECT mastered FROM question_review_state').get().mastered,1)
    assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(),[])
  } finally { db.close() }
})

test('parts calculation and probability-weighted profits match the paper',()=>{ assert.equal(10*(1+2)-5,25); const outcomes=[[4,[[4,1]]],[5,[[4,.3],[5,.7]]],[6,[[4,.3],[5,.3],[6,.4]]],[7,[[4,.3],[5,.3],[6,.3],[7,.1]]]];const profits=outcomes.map(([stock,values])=>values.reduce((sum,[sold,p])=>sum+p*(sold*1000-(stock-sold)*300),0)); assert.deepEqual(profits,[4000,4610,4830,4660]) })
