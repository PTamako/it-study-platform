import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'

const migration = readFileSync(new URL('../migrations/0155_fe_exemption_20201213_selected.sql', import.meta.url), 'utf8')
const provenance = readFileSync(new URL('../migrations/0125_fe_exemption_provenance.sql', import.meta.url), 'utf8')
const pool = readFileSync(new URL('../migrations/0128_indexed_mock_draw_pool.sql', import.meta.url), 'utf8')

test('December 2020 batch retains official answer keys and is safe to apply twice', () => {
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
    db.exec(provenance)
    db.exec(pool)
    db.exec(migration)
    db.exec(migration)
    const rows = db.prepare(`SELECT o.sitting_date,o.original_question,o.official_answer,o.canonical_question_id,q.answer_json,q.options_json,q.exam_origin,q.explanation
      FROM fe_exemption_occurrences o JOIN questions q ON q.id=o.canonical_question_id ORDER BY o.sitting_date,o.original_question`).all()
    assert.deepEqual(rows.map(r => [r.sitting_date,r.original_question,r.official_answer]), [
      ['2020-12-13',41,'d'],['2020-12-13',42,'c'],['2020-12-13',44,'b'],
      ['2020-12-13',45,'d'],['2020-12-13',46,'c'],['2020-12-13',48,'d'],['2020-12-13',50,'d'],
      ['2022-06-12',36,'b'],['2022-06-12',50,'d'],['2022-07-24',43,'c'],
      ['2022-07-24',45,'d'],['2022-07-24',49,'d'],['2022-12-11',43,'d']])
    assert.equal(rows[2].canonical_question_id,rows[7].canonical_question_id)
    assert.equal(rows[6].canonical_question_id,rows[8].canonical_question_id)
    assert.equal(rows[1].canonical_question_id,rows[9].canonical_question_id)
    assert.equal(rows[3].canonical_question_id,rows[10].canonical_question_id)
    assert.equal(rows[5].canonical_question_id,rows[11].canonical_question_id)
    assert.equal(rows[0].canonical_question_id,rows[12].canonical_question_id)
    for (const r of rows) {
      assert.equal(JSON.parse(r.answer_json),r.official_answer)
      assert.equal(JSON.parse(r.options_json).length,4)
      assert.equal(r.exam_origin,'fe_exemption')
      assert.match(r.explanation,/中文解析/)
    }
    assert.equal(db.prepare("SELECT COUNT(*) AS n FROM mock_question_pool WHERE exam_origin='fe_exemption'").get().n,7)
    assert.equal(db.prepare("SELECT prompt FROM questions WHERE id='existing'").get().prompt,'unchanged')
    assert.equal(db.prepare('SELECT count(*) AS n FROM study_attempts').get().n,1)
    assert.doesNotMatch(migration,/\b(?:DELETE|UPDATE|REPLACE|DROP)\b/i)
  } finally { db.close() }
})
