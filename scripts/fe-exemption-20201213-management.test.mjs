import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'

const file = (name) => readFileSync(new URL(`../migrations/${name}`, import.meta.url), 'utf8')
test('2020 exemption questions and exact 2022 repeats preserve keys, history and indexed pool', () => {
  const db = new DatabaseSync(':memory:')
  try {
    db.exec(`PRAGMA foreign_keys=ON;
      CREATE TABLE questions(id TEXT PRIMARY KEY, track_id TEXT NOT NULL, topic TEXT, difficulty TEXT,
        question_type TEXT, prompt TEXT, options_json TEXT, answer_json TEXT, explanation TEXT,
        source_type TEXT NOT NULL, source_reference TEXT, language TEXT, exam_section TEXT,
        exam_section_method TEXT, question_kind TEXT NOT NULL DEFAULT 'standard');
      CREATE TABLE study_attempts(id TEXT PRIMARY KEY, question_id TEXT);
      INSERT INTO questions(id,track_id,topic,prompt,source_type) VALUES ('existing','exam-fe','keep','unchanged','personal');
      INSERT INTO study_attempts VALUES ('attempt','existing');`)
    db.exec(file('0125_fe_exemption_provenance.sql'))
    db.exec(file('0128_indexed_mock_draw_pool.sql'))
    const migration = file('0156_fe_exemption_20201213_management.sql')
    db.exec(migration); db.exec(migration)
    const rows = db.prepare(`SELECT o.sitting_date,o.original_question,o.official_answer,o.canonical_question_id,
      q.answer_json,q.options_json,q.explanation FROM fe_exemption_occurrences o
      JOIN questions q ON q.id=o.canonical_question_id ORDER BY o.sitting_date,o.original_question`).all()
    assert.deepEqual(rows.map(r=>[r.sitting_date,r.original_question,r.official_answer]),[
      ['2020-12-13',51,'c'],['2020-12-13',54,'d'],['2020-12-13',55,'a'],
      ['2020-12-13',56,'d'],['2020-12-13',57,'c'],['2020-12-13',58,'d'],['2020-12-13',59,'c'],
      ['2020-12-13',60,'a'],['2020-12-13',61,'a'],['2020-12-13',62,'d'],['2020-12-13',65,'c'],
      ['2020-12-13',66,'a'],['2020-12-13',67,'b'],['2020-12-13',68,'d'],['2020-12-13',69,'d'],
      ['2020-12-13',70,'c'],['2020-12-13',71,'a'],['2020-12-13',72,'d'],['2020-12-13',73,'d'],
      ['2020-12-13',74,'b'],['2020-12-13',76,'c'],['2020-12-13',78,'d'],
      ['2020-12-13',79,'d'],['2020-12-13',80,'a'],
      ['2022-06-12',59,'c'],['2022-06-12',66,'a'],['2022-06-12',67,'b'],['2022-06-12',73,'a'],['2022-06-12',74,'d'],
      ['2022-07-24',54,'d'],['2022-07-24',55,'a'],['2022-07-24',61,'a'],['2022-07-24',62,'d'],
      ['2022-12-11',55,'d']])
    assert.equal(rows[1].canonical_question_id,rows[29].canonical_question_id)
    assert.equal(rows[2].canonical_question_id,rows[30].canonical_question_id)
    for (const [original, repeated] of [[59,24],[66,25],[67,26],[71,27],[72,28],[61,31],[62,32],[56,33]]) {
      assert.equal(rows.find(row => row.sitting_date === '2020-12-13' && row.original_question === original).canonical_question_id,rows[repeated].canonical_question_id)
    }
    for (const row of rows) {
      assert.equal(JSON.parse(row.answer_json),row.official_answer)
      assert.equal(JSON.parse(row.options_json).length,4)
      assert.match(row.explanation,/中文解析/)
      assert.doesNotMatch(row.explanation,/\\n/)
    }
    assert.equal(db.prepare("SELECT COUNT(*) AS n FROM mock_question_pool WHERE exam_origin='fe_exemption'").get().n,24)
    assert.equal(db.prepare("SELECT prompt FROM questions WHERE id='existing'").get().prompt,'unchanged')
    assert.equal(db.prepare('SELECT count(*) AS n FROM study_attempts').get().n,1)
    assert.doesNotMatch(migration,/\b(?:DELETE|UPDATE|REPLACE|DROP)\b/i)
  } finally { db.close() }
})

test('source figures for production capacity and expected inspection cost yield the stated answers', () => {
  let best = 0
  for (let x = 0; x <= 1000; x++) for (let y = 0; y <= 900; y++) {
    const remaining = 12000 - 6*x - 10*y
    if (remaining < 0) continue
    const z = Math.min(500, Math.floor(remaining / 15))
    best = Math.max(best, 1800*x + 2500*y + 3000*z)
  }
  assert.equal(best,3300000)
  assert.deepEqual([[0,1500],[40,1000],[80,500],[120,200]].map(([good,bad])=>0.9*good+0.1*bad),[150,136,122,128])
})
