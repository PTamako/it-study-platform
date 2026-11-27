import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'

const officialKeys = ('d d b a d a c d b d a c d c a a c c b c ' +
  'd b c d b c b d d b d c c b c b c a b c ' +
  'c b c c a b c a b a d c b b a a b c d d ' +
  'a d a b c c c a c a d c c d c c c d d b').split(' ')
const existing = [
  ['fe-ipa-official-2019-spring-a-03','d'], ['fe-exempt-2021-20210613-q02','a'],
  ['fe-ipa-sample-2022-a-009','d'], ['fe-exempt-2021-20210613-q15','a'],
  ['fe-exempt-2020-20201213-q17','c'], ['fe-exempt-2021-20210725-q20','c'],
  ['fe-exempt-2021-20210725-q21','d'], ['fe-exempt-2020-20200726-q21','b'],
  ['fe-exempt-2021-20210725-q23','c'], ['fe-ipa-2019-spring-am-adapt-28','b'],
  ['fe-exempt-2021-20210613-q27','d'], ['fe-ipa-official-2026-a-09','c'],
  ['fe-exempt-2021-20210725-q43','a'], ['fe-exempt-2021-20210613-q38','b'],
  ['fe-exempt-2021-20210613-q40','c'], ['fe-ipa-official-2023-a-10','c'],
  ['fe-exempt-2021-20210725-q47','b'], ['fe-exempt-2020-20200614-q53','d'],
  ['fe-ipa-2019-spring-am-adapt-56','a'], ['fe-exempt-2021-20210613-q56','a'],
  ['fe-exempt-2020-20200726-q57','b'], ['fe-exempt-2021-20210613-q60','d'],
  ['fe-exempt-2021-20210725-q60','d'], ['fe-ipa-sample-2022-a-049','a'],
  ['fe-exempt-2021-20210613-q65','c'], ['fe-exempt-2021-20210613-q70','a'],
  ['fe-exempt-2021-20210725-q71','d'], ['fe-exempt-2021-20210613-q72','c'],
  ['fe-ipa-2019-spring-am-adapt-73','d'], ['fe-ipa-sample-2022-a-057','c'],
  ['fe-exempt-2020-20201213-q78','d'], ['fe-exempt-2020-20201213-q79','d'],
]
const migration = name => readFileSync(new URL(`../migrations/${name}`, import.meta.url), 'utf8')

test('200 FE additions, official answers, references and existing attempts survive repeat migration', () => {
  const db = new DatabaseSync(':memory:')
  try {
    db.exec(`PRAGMA foreign_keys=ON;
      CREATE TABLE questions(id TEXT PRIMARY KEY,track_id TEXT,topic TEXT,difficulty TEXT,
        question_type TEXT,prompt TEXT,options_json TEXT,answer_json TEXT,explanation TEXT,
        source_type TEXT,source_reference TEXT,language TEXT,exam_section TEXT,
        exam_section_method TEXT,question_kind TEXT,exam_origin TEXT);
      CREATE TABLE fe_exemption_occurrences(sitting_date TEXT,original_question INTEGER,
        fiscal_year INTEGER,canonical_question_id TEXT REFERENCES questions(id),
        official_answer TEXT,question_url TEXT,answer_url TEXT,
        PRIMARY KEY(sitting_date,original_question));
      CREATE TABLE study_attempts(id TEXT PRIMARY KEY,question_id TEXT REFERENCES questions(id));`)
    const insert = db.prepare('INSERT INTO questions(id,answer_json) VALUES(?,?)')
    for (const [id, answer] of existing) insert.run(id, JSON.stringify(answer))
    db.prepare('INSERT INTO study_attempts VALUES(?,?)').run('keep',existing[0][0])
    const sql1 = migration('0222_fe_exemption_20230122_curated.sql')
    const sql2 = migration('0223_fe_original_practice_20261127.sql')
    assert.ok(sql2.split(';').every(statement => Buffer.byteLength(statement,'utf8') < 90_000),
      'each original-question INSERT must fit D1 statement-size limits')
    db.exec(sql1); db.exec(sql2); db.exec(sql1); db.exec(sql2)

    const added = db.prepare("SELECT * FROM questions WHERE id LIKE 'fe-exempt-2022-20230122-q%' OR id LIKE 'fe-original-20261127-q%' ORDER BY id").all()
    assert.equal(added.length, 200)
    assert.equal(new Set(added.map(q => q.prompt)).size, 200)
    assert.equal(added.filter(q => q.source_type === 'licensed').length, 39)
    assert.equal(added.filter(q => q.source_type === 'generated').length, 161)
    for (const row of added) {
      const choices = JSON.parse(row.options_json), answer = JSON.parse(row.answer_json)
      assert.equal(row.track_id, 'exam-fe')
      assert.equal(row.exam_section, 'A')
      assert.deepEqual(choices.map(c => c.id), ['a','b','c','d'])
      assert.equal(new Set(choices.map(c => c.text)).size, 4)
      assert.ok(choices.some(c => c.id === answer))
      assert.match(row.explanation, /中文：/)
      assert.ok(row.explanation.split('中文：').every(part => part.length > 8))
      if (row.source_type === 'generated') assert.match(row.source_reference, /IPA公式過去問ではありません/)
      else assert.match(row.source_reference, /tokurei_Mondai_20230122_FE\.pdf$/)
    }

    const source = readFileSync(new URL('./fe-20261127-practice.tsv', import.meta.url), 'utf8').trimEnd().split('\n')
    for (let i=0;i<source.length;i++) {
      const fields = source[i].split('|')
      assert.equal(fields.length,8)
      const row = added.find(q => q.id === `fe-original-20261127-q${String(i+1).padStart(3,'0')}`)
      const correct = JSON.parse(row.options_json).find(c => c.id === JSON.parse(row.answer_json)).text
      assert.equal(correct,fields[2],fields[0])
    }

    const occ = db.prepare('SELECT o.*,q.answer_json FROM fe_exemption_occurrences o JOIN questions q ON q.id=o.canonical_question_id ORDER BY original_question').all()
    assert.equal(occ.length,71)
    for (const row of occ) {
      assert.equal(row.official_answer,officialKeys[row.original_question-1], `IPA q${row.original_question}`)
      assert.equal(JSON.parse(row.answer_json),row.official_answer)
      assert.equal(row.fiscal_year,2022)
      assert.match(row.question_url,/tokurei_Mondai_20230122_FE\.pdf$/)
      assert.match(row.answer_url,/tokurei_ans_20230122_FE\.pdf$/)
    }
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM study_attempts').get().n,1)
    assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(),[])
  } finally { db.close() }
})

test('independently check representative calculations and page replacements', () => {
  assert.equal((2/16+4/256+8/4096),73/512)
  assert.equal(20 + 10/2 + 10*(4/20),27)
  assert.equal((48-16)*22/16-(48-16)+(22-16),18)
  const pages=[1,3,2,1,4,5,2,3,4,5]
  const count = lru => {
    let frames=[], replacements=0
    for (const p of pages) {
      const at=frames.indexOf(p)
      if (at !== -1) { if (lru) frames.push(...frames.splice(at,1)); continue }
      if (frames.length === 3) {frames.shift(); replacements++}
      frames.push(p)
    }
    return replacements
  }
  assert.equal(count(false),3)
  assert.equal(count(true),6)
  assert.equal(12*11/2-10*9/2,21)
  assert.equal(60/0.3,200)
})
