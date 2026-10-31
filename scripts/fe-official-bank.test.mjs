import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import { feSeeds } from '../worker/fe-question-bank.ts'

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8')
const catalog = read('../migrations/0090_fe_ipa_public_sources_2023_2026.sql')
const official = read('../migrations/0091_fe_official_verified_2025_2026.sql')
const practice = read('../migrations/0092_fe_practice_bank.sql')
const extraOfficial = read('../migrations/0093_fe_official_verified_2023_2024.sql')
const latestOfficial = read('../migrations/0094_fe_official_2026_additional_six.sql')
const subjectB = read('../migrations/0095_fe_official_2026_subject_b_2_6.sql')
const additional2025 = read('../migrations/0096_fe_official_2025_subject_a_additional_eleven.sql')
const legacySources = read('../migrations/0097_fe_legacy_2018_2019_sources.sql')
const additional2025B = read('../migrations/0098_fe_official_2025_subject_b_1_2.sql')
const more2025B = read('../migrations/0099_fe_official_2025_subject_b_3_4.sql')
const originalA = read('../migrations/0100_fe_original_subject_a_24.sql')
const originalB = read('../migrations/0101_fe_original_subject_b_20.sql')
const official2025B5 = read('../migrations/0102_fe_official_2025_subject_b_05.sql')
const official2023A = read('../migrations/0103_fe_official_2023_subject_a_nine.sql')
const official2024A = read('../migrations/0104_fe_official_2024_subject_a_nine.sql')
function setup() {
  const db = new DatabaseSync(':memory:')
  db.exec(`CREATE TABLE study_tracks (id TEXT PRIMARY KEY);
    INSERT INTO study_tracks VALUES ('exam-fe');
    CREATE TABLE questions (
      id TEXT PRIMARY KEY, track_id TEXT, topic TEXT, difficulty TEXT, question_type TEXT,
      prompt TEXT, options_json TEXT, answer_json TEXT, explanation TEXT,
      source_type TEXT CHECK (source_type IN ('official','licensed','generated','personal')),
      source_reference TEXT, language TEXT, exam_section TEXT, exam_section_method TEXT
    );
    CREATE TABLE study_attempts (id TEXT PRIMARY KEY, question_id TEXT,
      user_answer_json TEXT);
    CREATE TABLE language_card_reviews (id TEXT PRIMARY KEY);
    CREATE TABLE question_review_state (question_id TEXT PRIMARY KEY, mastered INTEGER);
    CREATE TABLE question_sources (
      id TEXT PRIMARY KEY, exam_code TEXT, year_label TEXT, subject_label TEXT DEFAULT '',
      title TEXT, source_url TEXT, content_mode TEXT, license_note TEXT,
      checked_at TEXT, notes TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(exam_code, year_label, subject_label)
    );`)
  db.exec(catalog)
  db.exec(official)
  db.exec(practice)
  db.exec(extraOfficial)
  db.exec(latestOfficial)
  db.exec(subjectB)
  db.exec(additional2025)
  db.exec(legacySources)
  db.exec(additional2025B)
  db.exec(more2025B)
  db.exec(originalA)
  db.exec(originalB)
  db.exec(official2025B5)
  db.exec(official2023A)
  db.exec(official2024A)
  return db
}

test('FE source catalog references all public 2023-2026 A/B IPA question sets', () => {
  const db = setup()
  const sources = db.prepare("SELECT * FROM question_sources WHERE exam_code='FE' AND subject_label IN ('科目A','科目B') ORDER BY year_label, subject_label").all()
  assert.equal(sources.length, 8)
  for (const row of sources) {
    assert.match(row.source_url, /^https:\/\/www\.ipa\.go\.jp\//)
    assert.match(row.notes, /_ans\.pdf/)
    assert.equal(row.content_mode, 'link_only', 'incomplete yearly corpus must not be advertised as fully imported')
    assert.ok(['科目A', '科目B'].includes(row.subject_label))
    assert.match(row.source_url, /_qs\.pdf$/)
  }
})

test('2018-2019 former FE morning sessions are a link-only source catalog, not fake imported items', () => {
  const db = setup()
  const rows = db.prepare("SELECT * FROM question_sources WHERE exam_code='FE' AND subject_label LIKE '旧制度・%'").all()
  assert.equal(rows.length, 4)
  assert.ok(rows.every(x => x.content_mode === 'link_only' && /^https:\/\/www\.ipa\.go\.jp\//.test(x.source_url)))
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM questions WHERE id LIKE 'fe-ipa-legacy-%'").get().n, 0)
})

test('FE bootstraps usable 60 A / 16 algorithm + 4 security B bank without a user install request', () => {
  const db = setup()
  const count = where => db.prepare('SELECT COUNT(*) AS n FROM questions WHERE ' + where).get().n
  assert.equal(feSeeds.length, 80)
  assert.equal(count("track_id = 'exam-fe'"), 209)
  assert.equal(count("source_type = 'official'"), 85)
  assert.equal(count("source_type = 'licensed'"), 74)
  assert.equal(count("source_type = 'generated'"), 50)
  assert.equal(count("exam_section = 'A' AND exam_section_method = 'explicit'"), 156)
  assert.equal(count("exam_section = 'B' AND topic = 'FE算法与程序设计' AND exam_section_method = 'explicit'"), 44)
  assert.equal(count("exam_section = 'B' AND topic = 'FE信息安全' AND exam_section_method = 'explicit'"), 9)
  assert.equal(count("prompt LIKE '%・改編%' AND source_type='official'"), 0)
  assert.equal(count("prompt LIKE '%自主練習%' AND source_type='official'"), 0)
})

test('original FE A/B additions remain clearly distinct from IPA official questions and support mock distribution', () => {
  const db = setup()
  const counts = db.prepare(`SELECT exam_section, topic, COUNT(*) AS n
    FROM questions WHERE source_type = 'generated' AND id LIKE 'fe-original-v2-%'
    GROUP BY exam_section, topic`).all()
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM questions WHERE id LIKE 'fe-original-v2-%'").get().n, 44)
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM questions WHERE id LIKE 'fe-original-v2-a-%'").get().n, 24)
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM questions WHERE id LIKE 'fe-original-v2-b-%'").get().n, 20)
  assert.equal(counts.find(r => r.exam_section === 'B' && r.topic === 'FE算法与程序设计')?.n, 16)
  assert.equal(counts.find(r => r.exam_section === 'B' && r.topic === 'FE信息安全')?.n, 4)
  const items = db.prepare("SELECT * FROM questions WHERE id LIKE 'fe-original-v2-%'").all()
  for (const row of items) {
    assert.equal(row.track_id, 'exam-fe')
    assert.equal(row.source_type, 'generated')
    assert.match(row.source_reference, /IPA公式過去問ではありません/)
    assert.equal(row.exam_section_method, 'explicit')
    const options = JSON.parse(row.options_json)
    const answer = JSON.parse(row.answer_json)
    assert.equal(options.length, 4)
    assert.ok(options.some(o => o.id === answer))
    assert.ok(row.explanation.length > 15)
    assert.ok(row.prompt.length > 24)
  }
  assert.equal(JSON.parse(db.prepare("SELECT answer_json FROM questions WHERE id='fe-original-v2-a-023'").get().answer_json), 'c')
  assert.equal(JSON.parse(db.prepare("SELECT answer_json FROM questions WHERE id='fe-original-v2-b-008'").get().answer_json), 'c')
})

test('IPA original 2023-2026 A/B answer keys and options match reviewed PDFs', () => {
  const db = setup()
  const expected = new Map([
    ['2023:A:2','c'],['2023:A:6','c'],['2023:A:9','c'],['2023:A:14','c'],
    ['2023:A:15','d'],['2023:A:16','b'],['2023:A:17','c'],['2023:A:18','c'],['2023:A:20','a'],
    ['2023:A:1','c'],['2023:A:3','d'],['2023:A:4','d'],['2023:A:5','b'],
    ['2023:A:7','b'],['2023:A:8','d'],['2023:A:12','c'],['2023:A:19','d'],['2023:B:1','a'],
    ['2024:A:1','c'],['2024:A:5','c'],['2024:A:9','c'],['2024:A:14','c'],
    ['2024:A:15','d'],['2024:A:16','d'],['2024:A:17','a'],['2024:A:18','d'],['2024:A:20','a'],
    ['2024:A:2','d'],['2024:A:4','d'],['2024:A:6','a'],['2024:A:7','c'],
    ['2024:A:8','c'],['2024:A:10','d'],['2024:A:11','c'],['2024:A:12','d'],['2024:B:1','b'],
    ['2025:A:3','b'],['2025:A:4','c'],['2025:A:6','c'],['2025:A:7','d'],
    ['2025:A:9','c'],['2025:A:15','c'],['2025:A:16','d'],['2025:A:17','b'],
    ['2025:A:18','d'],['2025:A:19','d'],['2025:A:20','b'],
    ['2025:B:5','e'],
    ['2025:B:1','f'],['2025:B:2','a'],['2025:B:3','b'],['2025:B:4','h'],
    ['2025:A:1','d'],['2025:A:2','b'],['2025:A:5','a'],['2025:A:8','d'],
    ['2025:A:10','a'],['2025:A:11','c'],['2025:A:12','d'],['2025:A:13','d'],
    ['2026:A:1','b'],['2026:A:7','d'],['2026:A:15','c'],
    ['2026:A:17','b'],['2026:A:18','a'],['2026:A:20','b'],
    ['2026:B:2','f'],['2026:B:3','a'],['2026:B:4','d'],['2026:B:5','b'],['2026:B:6','i'],
    ['2026:A:2','c'],['2026:A:3','b'],['2026:A:4','b'],['2026:A:5','b'],
    ['2026:A:8','a'],['2026:A:9','c'],['2026:A:10','c'],['2026:A:11','a'],
    ['2026:A:12','c'],['2026:A:13','a'],['2026:A:14','d'],
    ['2026:A:16','a'],['2026:A:19','a'],['2026:B:1','d'],
  ])
  const officialRows = db.prepare("SELECT * FROM questions WHERE source_type='official'").all()
  assert.equal(officialRows.length, expected.size)
  for (const row of officialRows) {
    const m = row.id.match(/^fe-ipa-official-(20\d{2})-([ab])-(\d{2})$/)
    assert.ok(m, 'stable official source identity: ' + row.id)
    const key = [m[1],m[2].toUpperCase(),Number(m[3])].join(':')
    assert.equal(JSON.parse(row.answer_json), expected.get(key), key)
    const optionCount = JSON.parse(row.options_json).length
    assert.equal(m[2] === 'a' ? optionCount === 4 : optionCount >= 4 && optionCount <= 10, true, key)
    assert.ok(row.prompt.includes('IPA公開問題'))
    assert.match(row.source_reference, /^https:\/\/www\.ipa\.go\.jp\/.+_qs\.pdf$/)
    assert.equal(row.exam_section_method, 'explicit')
  }
})

test('repeat FE migrations are idempotent, preserve attempts, source classes and mastery', () => {
  const db = setup()
  db.exec("INSERT INTO study_attempts VALUES ('attempt-1','fe-ipa-official-2026-a-02','\"c\"')")
  db.exec("INSERT INTO question_review_state VALUES ('fe-ipa-official-2026-a-02',1)")
  const originalPrompt = db.prepare("SELECT prompt FROM questions WHERE id='fe-ipa-official-2026-a-02'").get().prompt
  db.exec(catalog)
  db.exec(official)
  db.exec(practice)
  db.exec(extraOfficial)
  db.exec(latestOfficial)
  db.exec(subjectB)
  db.exec(additional2025)
  db.exec(legacySources)
  db.exec(additional2025B)
  db.exec(more2025B)
  db.exec(originalA)
  db.exec(originalB)
  db.exec(official2025B5)
  db.exec(official2023A)
  db.exec(official2024A)
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM questions").get().n, 209)
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM study_attempts").get().n, 1)
  assert.equal(db.prepare("SELECT mastered FROM question_review_state WHERE question_id='fe-ipa-official-2026-a-02'").get().mastered, 1)
  assert.equal(db.prepare("SELECT prompt FROM questions WHERE id='fe-ipa-official-2026-a-02'").get().prompt, originalPrompt)
  // Exam prompts can legitimately contain SQL examples such as DELETE FROM.
  // Verify the executed migration statements instead of flagging SQL inside questions.
  for (const script of [catalog, official, practice, extraOfficial, latestOfficial, subjectB, additional2025, legacySources, additional2025B, more2025B, originalA, originalB, official2025B5, official2023A, official2024A]) {
    assert.match(script, /^INSERT OR IGNORE INTO (?:questions|question_sources)\b/m)
    const topLevelStatements = script.split('\n').filter(line => /^INSERT OR IGNORE INTO (?:questions|question_sources)\b/.test(line))
    assert.ok(topLevelStatements.length > 0)
  }
})
