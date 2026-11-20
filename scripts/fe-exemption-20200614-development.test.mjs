import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'

test('IPA 2020 June 41–52: official answers and additive, repeatable import', () => {
  const db = new DatabaseSync(':memory:')
  try {
    db.exec(`PRAGMA foreign_keys=ON;
      CREATE TABLE questions(id TEXT PRIMARY KEY,track_id TEXT,topic TEXT,difficulty TEXT,question_type TEXT,prompt TEXT,options_json TEXT,answer_json TEXT,explanation TEXT,source_type TEXT,source_reference TEXT,language TEXT,exam_section TEXT,exam_section_method TEXT,question_kind TEXT,exam_origin TEXT);
      CREATE TABLE fe_exemption_occurrences(sitting_date TEXT,original_question INTEGER,fiscal_year TEXT,canonical_question_id TEXT REFERENCES questions(id),official_answer TEXT,question_url TEXT,answer_url TEXT,PRIMARY KEY(sitting_date,original_question));
      CREATE TABLE study_attempts(id TEXT PRIMARY KEY,question_id TEXT REFERENCES questions(id));
      INSERT INTO questions(id,answer_json) VALUES ('existing','"a"'), ('fe-ipa-2019-spring-am-adapt-42','"a"'), ('fe-ipa-2019-spring-am-adapt-47','"b"'), ('fe-ipa-2019-spring-am-adapt-52','"d"');
      INSERT INTO study_attempts VALUES ('keep','existing');`)
    const sql = readFileSync(new URL('../migrations/0196_fe_exemption_20200614_development.sql', import.meta.url), 'utf8')
    db.exec(sql); db.exec(sql)
    const rows = db.prepare('SELECT o.*, q.answer_json, q.options_json, q.explanation, q.prompt, q.source_type, q.exam_section FROM fe_exemption_occurrences o JOIN questions q ON q.id=o.canonical_question_id ORDER BY o.original_question').all()
    const answers = ['a','d','d','b','b','b','c','d','b','d','d','d']
    assert.equal(rows.length, 12)
    rows.forEach((row, i) => {
      assert.equal(row.original_question, 41 + i)
      assert.equal(row.official_answer, answers[i])
      assert.equal(JSON.parse(row.answer_json), answers[i])
      if ([0, 5, 11].includes(i)) return
      const options = JSON.parse(row.options_json)
      assert.equal(options.length, 4)
      assert.ok(options.some(option => option.id === answers[i]))
      assert.match(row.explanation, /中文：/)
      assert.equal(row.source_type, 'licensed')
      assert.equal(row.exam_section, 'A')
    })
    assert.match(rows[6].prompt, /後半ほど傾きが大きく/)
    assert.match(rows[10].prompt, /大（単純0.8、普通1.0、複雑1.2）/)
    assert.deepEqual([rows[0].canonical_question_id, rows[5].canonical_question_id, rows[11].canonical_question_id], ['fe-ipa-2019-spring-am-adapt-42','fe-ipa-2019-spring-am-adapt-47','fe-ipa-2019-spring-am-adapt-52'])
    assert.equal((30*.4 + 40*.9 + 20*1 + 10*1.2 + 5)*1.2, 102)
    assert.equal(db.prepare('SELECT COUNT(*) n FROM questions').get().n, 13)
    assert.equal(db.prepare('SELECT COUNT(*) n FROM study_attempts').get().n, 1)
    assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(), [])
  } finally { db.close() }
})
