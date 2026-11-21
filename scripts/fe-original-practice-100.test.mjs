import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'

test('100 original FE questions are distinct, valid and safely repeatable', () => {
  const db = new DatabaseSync(':memory:')
  try {
    db.exec(`PRAGMA foreign_keys=ON;
      CREATE TABLE questions (id TEXT PRIMARY KEY,track_id TEXT,topic TEXT,difficulty TEXT,question_type TEXT,prompt TEXT,options_json TEXT,answer_json TEXT,explanation TEXT,source_type TEXT,source_reference TEXT,language TEXT,exam_section TEXT,exam_section_method TEXT,question_kind TEXT,exam_origin TEXT);
      CREATE TABLE study_attempts(id TEXT PRIMARY KEY,question_id TEXT REFERENCES questions(id));
      INSERT INTO questions(id,track_id) VALUES('existing','exam-fe');
      INSERT INTO study_attempts VALUES('keep','existing');`)
    const sql = readFileSync(new URL('../migrations/0208_fe_original_practice_100.sql', import.meta.url), 'utf8')
    db.exec(sql); db.exec(sql)
    const rows = db.prepare("SELECT * FROM questions WHERE id LIKE 'fe-original-20261121-%' ORDER BY id").all()
    assert.equal(rows.length, 100)
    assert.equal(new Set(rows.map(r => r.prompt)).size, 100)
    for (const row of rows) {
      const options = JSON.parse(row.options_json), answer = JSON.parse(row.answer_json)
      assert.equal(row.source_type, 'generated')
      assert.match(row.source_reference, /IPA公式過去問ではありません/)
      assert.match(row.explanation, /中文：/)
      assert.equal(row.track_id, 'exam-fe')
      assert.equal(row.exam_section, 'A')
      assert.equal(options.length, 4)
      assert.equal(new Set(options.map(o => o.text)).size, 4)
      assert.deepEqual(options.map(o => o.id), ['a', 'b', 'c', 'd'])
      assert.ok(options.some(o => o.id === answer))
    }
    const answerText = id => { const r=rows.find(x=>x.id.endsWith(id)); return JSON.parse(r.options_json).find(o=>o.id===JSON.parse(r.answer_json)).text }
    assert.equal(answerText('015'), '192.0.2.64')
    assert.equal(answerText('046'), '−128〜127')
    assert.equal(answerText('065'), 'RTO')
    assert.equal(answerText('066'), 'RPO')
    assert.equal(db.prepare('SELECT count(*) n FROM study_attempts').get().n, 1)
    assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(), [])
  } finally { db.close() }
})
