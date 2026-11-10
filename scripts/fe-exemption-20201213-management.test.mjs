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
      ['2020-12-13',60,'a'],['2020-12-13',69,'d'],['2022-07-24',54,'d'],['2022-07-24',55,'a']])
    assert.equal(rows[1].canonical_question_id,rows[5].canonical_question_id)
    assert.equal(rows[2].canonical_question_id,rows[6].canonical_question_id)
    for (const row of rows) {
      assert.equal(JSON.parse(row.answer_json),row.official_answer)
      assert.equal(JSON.parse(row.options_json).length,4)
      assert.match(row.explanation,/中文解析/)
      assert.doesNotMatch(row.explanation,/\\n/)
    }
    assert.equal(db.prepare("SELECT COUNT(*) AS n FROM mock_question_pool WHERE exam_origin='fe_exemption'").get().n,5)
    assert.equal(db.prepare("SELECT prompt FROM questions WHERE id='existing'").get().prompt,'unchanged')
    assert.equal(db.prepare('SELECT count(*) AS n FROM study_attempts').get().n,1)
    assert.doesNotMatch(migration,/\b(?:DELETE|UPDATE|REPLACE|DROP)\b/i)
  } finally { db.close() }
})
