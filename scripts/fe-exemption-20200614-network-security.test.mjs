import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'

test('2020 June questions 31–40 preserve IPA answers, deduplicate q33, and are idempotent', () => {
  const db = new DatabaseSync(':memory:')
  try {
    db.exec(`PRAGMA foreign_keys=ON;
      CREATE TABLE questions(id TEXT PRIMARY KEY,track_id TEXT,topic TEXT,difficulty TEXT,question_type TEXT,prompt TEXT,options_json TEXT,answer_json TEXT,explanation TEXT,source_type TEXT,source_reference TEXT,language TEXT,exam_section TEXT,exam_section_method TEXT,question_kind TEXT,exam_origin TEXT);
      CREATE TABLE fe_exemption_occurrences(sitting_date TEXT,original_question INTEGER,fiscal_year TEXT,canonical_question_id TEXT REFERENCES questions(id),official_answer TEXT,question_url TEXT,answer_url TEXT,PRIMARY KEY(sitting_date,original_question));
      CREATE TABLE study_attempts(id TEXT PRIMARY KEY,question_id TEXT REFERENCES questions(id));
      INSERT INTO questions(id,answer_json) VALUES ('fe-exempt-2022-20221211-q33','"c"');
      INSERT INTO study_attempts VALUES ('keep','fe-exempt-2022-20221211-q33');`)
    const sql = readFileSync(new URL('../migrations/0195_fe_exemption_20200614_network_security.sql', import.meta.url), 'utf8')
    db.exec(sql); db.exec(sql)
    const rows = db.prepare('SELECT o.*, q.answer_json, q.options_json, q.explanation, q.source_type, q.exam_section FROM fe_exemption_occurrences o JOIN questions q ON q.id=o.canonical_question_id ORDER BY o.original_question').all()
    const answers = ['a','c','c','b','a','d','b','b','a','b']
    assert.equal(rows.length, 10)
    rows.forEach((row, i) => {
      assert.equal(row.original_question, 31 + i)
      assert.equal(row.official_answer, answers[i])
      assert.equal(JSON.parse(row.answer_json), answers[i])
      if (i !== 2) {
        assert.equal(JSON.parse(row.options_json).length, 4)
        assert.match(row.explanation, /中文：/)
        assert.equal(row.source_type, 'licensed')
        assert.equal(row.exam_section, 'A')
      }
    })
    assert.equal(rows[2].canonical_question_id, 'fe-exempt-2022-20221211-q33')
    assert.equal(db.prepare('SELECT COUNT(*) n FROM questions').get().n, 10)
    assert.equal(db.prepare('SELECT COUNT(*) n FROM study_attempts').get().n, 1)
    assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(), [])
  } finally { db.close() }
})
