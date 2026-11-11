import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'

const migration = readFileSync(new URL('../migrations/0158_fe_exemption_20201213_shared_samples.sql', import.meta.url), 'utf8')

test('shared sample mappings preserve canonical questions and progress, match keys and import idempotently', () => {
  const db = new DatabaseSync(':memory:')
  try {
    db.exec(`PRAGMA foreign_keys=ON;
      CREATE TABLE questions(id TEXT PRIMARY KEY, answer_json TEXT NOT NULL, prompt TEXT NOT NULL);
      CREATE TABLE question_review_state(question_id TEXT PRIMARY KEY REFERENCES questions(id), mastered INTEGER);
      CREATE TABLE study_attempts(id TEXT PRIMARY KEY, question_id TEXT REFERENCES questions(id));
      CREATE TABLE fe_exemption_occurrences(sitting_date TEXT NOT NULL, original_question INTEGER NOT NULL,
        fiscal_year INTEGER NOT NULL, canonical_question_id TEXT NOT NULL REFERENCES questions(id),
        official_answer TEXT NOT NULL, question_url TEXT NOT NULL, answer_url TEXT NOT NULL,
        PRIMARY KEY(sitting_date, original_question));`)
    for (const n of ['002','015','018','019']) {
      const id='fe-ipa-sample-2022-a-'+n
      db.prepare('INSERT INTO questions VALUES (?, ?, ?)').run(id, '"d"', 'original sample '+n)
      db.prepare('INSERT INTO question_review_state VALUES (?, 1)').run(id)
      db.prepare('INSERT INTO study_attempts VALUES (?, ?)').run('attempt-'+n,id)
    }
    db.exec(migration)
    db.exec(migration)
    const rows=db.prepare(`SELECT sitting_date,original_question,canonical_question_id,official_answer,
      json_extract(answer_json,'$') AS canonical_answer
      FROM fe_exemption_occurrences JOIN questions ON id=canonical_question_id ORDER BY sitting_date,original_question`).all()
    assert.deepEqual(rows.map(r=>[r.sitting_date,r.original_question,r.canonical_question_id,r.official_answer,r.canonical_answer]), [
      ['2020-12-13',1,'fe-ipa-sample-2022-a-002','d','d'],
      ['2020-12-13',18,'fe-ipa-sample-2022-a-015','d','d'],
      ['2020-12-13',19,'fe-ipa-sample-2022-a-018','d','d'],
      ['2020-12-13',20,'fe-ipa-sample-2022-a-019','d','d'],
      ['2022-06-12',17,'fe-ipa-sample-2022-a-015','d','d'],
      ['2022-06-12',20,'fe-ipa-sample-2022-a-019','d','d'],
    ])
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM questions').get().n,4)
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM study_attempts').get().n,4)
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM question_review_state WHERE mastered=1').get().n,4)
    assert.equal(db.prepare('PRAGMA foreign_key_check').all().length,0)
  } finally { db.close() }
})

test('existing sample adaptations retain the same option ordering and official answer', () => {
  const read = name => JSON.parse(readFileSync(new URL('../scripts/data/'+name, import.meta.url), 'utf8')).items
  const items = [...read('fe-2022-official-samples-a-remaining28.json'), ...read('fe-2022-official-samples-part1.json')]
  for (const number of [2,15,18,19]) {
    const item=items.find(q=>q.question_number===number)
    assert.ok(item, `sample ${number} exists`)
    assert.equal(item.answer,3)
    assert.equal(item.options.length,4)
  }
})
