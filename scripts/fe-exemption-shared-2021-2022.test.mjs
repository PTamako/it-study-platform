import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'

test('repeated IPA paper positions reuse canonical questions without changing history', () => {
  const db = new DatabaseSync(':memory:')
  try {
    db.exec(`PRAGMA foreign_keys=ON;
      CREATE TABLE questions(id TEXT PRIMARY KEY, track_id TEXT, topic TEXT, difficulty TEXT, question_type TEXT, prompt TEXT, options_json TEXT, answer_json TEXT NOT NULL, explanation TEXT, source_type TEXT, source_reference TEXT, language TEXT, exam_section TEXT, exam_section_method TEXT, question_kind TEXT, exam_origin TEXT);
      CREATE TABLE fe_exemption_occurrences(sitting_date TEXT NOT NULL, original_question INTEGER NOT NULL, fiscal_year TEXT NOT NULL, canonical_question_id TEXT NOT NULL REFERENCES questions(id), official_answer TEXT NOT NULL, question_url TEXT NOT NULL, answer_url TEXT NOT NULL, PRIMARY KEY(sitting_date, original_question));
      CREATE TABLE study_attempts(id TEXT PRIMARY KEY, question_id TEXT REFERENCES questions(id));
      CREATE TABLE question_review_state(question_id TEXT PRIMARY KEY REFERENCES questions(id), mastered INTEGER);`)
    const ids = [['fe-ipa-sample-2022-a-004','a'],['fe-exempt-2020-20201213-q28','d'],['fe-ipa-2019-spring-am-adapt-50','a']]
    const insert = db.prepare('INSERT INTO questions(id, answer_json) VALUES (?, ?)')
    for (const [id, answer] of ids) insert.run(id, JSON.stringify(answer))
    db.exec("INSERT INTO study_attempts VALUES('attempt','fe-ipa-2019-spring-am-adapt-50'); INSERT INTO question_review_state VALUES('fe-ipa-2019-spring-am-adapt-50',1)")
    const sql = readFileSync(new URL('../migrations/0162_fe_exemption_shared_2021_2022.sql', import.meta.url), 'utf8')
    db.exec(sql); db.exec(sql)
    const rows = db.prepare('SELECT o.*, q.answer_json FROM fe_exemption_occurrences o JOIN questions q ON q.id=o.canonical_question_id ORDER BY sitting_date, original_question').all()
    assert.equal(rows.length, 5)
    assert.deepEqual(rows.map(r=>[r.sitting_date,r.original_question,r.canonical_question_id,r.official_answer]), [
      ['2021-06-13',5,ids[0][0],'a'],['2021-06-13',22,'fe-exempt-2021-20210613-q22','c'],['2022-12-11',22,'fe-exempt-2021-20210613-q22','c'],['2022-12-11',27,ids[1][0],'d'],['2022-12-11',49,ids[2][0],'a']])
    for (const row of rows) assert.equal(JSON.parse(row.answer_json), row.official_answer)
    assert.equal(db.prepare('SELECT COUNT(*) n FROM study_attempts').get().n,1)
    assert.equal(db.prepare('SELECT mastered FROM question_review_state').get().mastered,1)
    assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(),[])
  } finally { db.close() }
})

test('automaton produces the canonical first choice', () => {
  let state=1, result=''
  for (const input of '0011001110') {
    if(input==='0') { result+='0'; state=1 }
    else if(state===1) { result+='0'; state=2 }
    else { result+='1'; state=3 }
  }
  assert.equal(result,'0001000110')
})

test('electricity consumption uses only the operating periods', () => {
  assert.equal(100 * 10 * (60 + 30) / 60, 1500)
})
