import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'

const source = readFileSync(new URL('../migrations/0109_sg_fe_2019_public_exams_2022_sample_sources.sql', import.meta.url), 'utf8')
const items = readFileSync(new URL('../migrations/0110_fe_official_2019_written_morning_first_twelve.sql', import.meta.url), 'utf8')

function setup() {
  const db = new DatabaseSync(':memory:')
  db.exec(`
    CREATE TABLE question_sources (
      id TEXT PRIMARY KEY, exam_code TEXT, year_label TEXT, subject_label TEXT,
      title TEXT, source_url TEXT, content_mode TEXT, license_note TEXT, checked_at TEXT, notes TEXT,
      UNIQUE(exam_code, year_label, subject_label)
    );
    CREATE TABLE questions (
      id TEXT PRIMARY KEY, track_id TEXT, topic TEXT, difficulty TEXT, question_type TEXT,
      prompt TEXT, options_json TEXT, answer_json TEXT, explanation TEXT,
      source_type TEXT, source_reference TEXT, language TEXT, exam_section TEXT, exam_section_method TEXT
    );
    CREATE TABLE study_attempts (id TEXT PRIMARY KEY, question_id TEXT, is_correct INTEGER);
    CREATE TABLE question_review_state (question_id TEXT PRIMARY KEY, mastered INTEGER);
  `)
  db.exec(source)
  db.exec(items)
  return db
}

test('2019 SG and FE official written exams are cataloged separately from 2022 samples', () => {
  const db = setup()
  const sources = db.prepare('SELECT * FROM question_sources').all()
  assert.equal(sources.length, 9)
  assert.equal(sources.filter(x => x.year_label === '2019' && x.exam_code === 'SG').length, 4)
  assert.equal(sources.filter(x => x.year_label === '2019' && x.exam_code === 'FE').length, 2)
  const samples = sources.filter(x => x.year_label === '2022')
  assert.equal(samples.length, 3)
  assert.equal(samples.filter(x => x.exam_code === 'SG').length, 1)
  assert.equal(samples.filter(x => x.exam_code === 'FE').length, 2)
  for (const row of sources) {
    assert.equal(row.content_mode, 'link_only')
    assert.match(row.source_url, /^https:\/\/www\.ipa\.go\.jp\//)
  }
  for (const row of samples) {
    assert.match(row.title, /サンプル/)
    assert.match(row.license_note, /2022年度の実際の試験の過去問ではありません/)
  }
})

test('2019 FE spring/autumn official originals have unique source-verified answer keys', () => {
  const db = setup()
  const expected = {
    spring: {1:'c',2:'c',3:'d',4:'c',5:'b',6:'a'},
    autumn: {1:'d',2:'c',4:'a',5:'a',6:'c',7:'d'},
  }
  const rows = db.prepare("SELECT * FROM questions WHERE id LIKE 'fe-ipa-official-2019-%'").all()
  assert.equal(rows.length, 12)
  for (const [session, keys] of Object.entries(expected)) {
    for (const [number, answer] of Object.entries(keys)) {
      const id = `fe-ipa-official-2019-${session}-a-${number.padStart(2, '0')}`
      const row = db.prepare('SELECT * FROM questions WHERE id=?').get(id)
      assert.ok(row, id)
      assert.equal(row.track_id, 'exam-fe')
      assert.equal(row.source_type, 'official')
      assert.equal(row.exam_section, 'A')
      assert.equal(row.exam_section_method, 'explicit')
      assert.match(row.prompt, /旧制度午前/)
      assert.match(row.source_reference, session === 'spring'
        ? /2019h31h_fe_am_qs\.pdf$/ : /2019r01a_fe_am_qs\.pdf$/)
      assert.equal(JSON.parse(row.answer_json), answer)
      const options = JSON.parse(row.options_json)
      assert.equal(options.length, 4)
      assert.ok(options.some(item => item.id === answer))
    }
  }
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM questions WHERE id LIKE '%-2020-%' OR id LIKE '%-2021-%' OR id LIKE '%-2022-%'").get().n, 0,
    'unpublished CBT papers or untranscribed samples must never be fabricated')
})

test('running 2019/2022 migrations again is harmless to saved answers and mastery', () => {
  const db = setup()
  db.exec("INSERT INTO study_attempts VALUES ('attempt-2019','fe-ipa-official-2019-spring-a-01',1)")
  db.exec("INSERT INTO question_review_state VALUES ('fe-ipa-official-2019-spring-a-01',1)")
  db.exec(source)
  db.exec(items)
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM question_sources").get().n, 9)
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM questions").get().n, 12)
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM study_attempts").get().n, 1)
  assert.equal(db.prepare("SELECT mastered FROM question_review_state WHERE question_id='fe-ipa-official-2019-spring-a-01'").get().mastered, 1)
  for (const migration of [source, items]) {
    assert.match(migration, /^INSERT OR IGNORE INTO /m)
    assert.doesNotMatch(migration.split('\n').filter(x => /^(?:DELETE|DROP|UPDATE|REPLACE)\b/.test(x)).join('\n'), /\S/)
  }
})

test('2019 FE practice year is selectable and 2020-2022 non-disclosure is explained in both exam screens', () => {
  const app = readFileSync(new URL('../src/App.vue', import.meta.url), 'utf8')
  assert.match(app, /\[2026, 2025, 2024, 2023, 2019\]/)
  assert.match(app, /2020〜2022年度のCBT過去問はIPA非公開です/g)
  assert.match(app, /IPA公式サンプル問題を見る/)
  assert.doesNotMatch(app, /2022年度.*公式過去問を\d+問収録/)
})
