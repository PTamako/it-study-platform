import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { stripTypeScriptTypes } from 'node:module'
import { DatabaseSync } from 'node:sqlite'

let source = await readFile(new URL('../worker/index.ts', import.meta.url), 'utf8')
source = source.replace("import { checkWriteRateLimit, handleAuthRequest, requireAuth } from './auth'",
  "const checkWriteRateLimit = async () => null; const handleAuthRequest = async () => null; const requireAuth = async () => null;")
source = source.replace("import { feSeeds, seedUrl } from './fe-question-bank'",
  "const feSeeds = []; const seedUrl = () => '';")
const worker = (await import('data:text/javascript;base64,' +
  Buffer.from(stripTypeScriptTypes(source, { mode: 'transform' })).toString('base64'))).default

function setup() {
  const sql = new DatabaseSync(':memory:')
  sql.exec(`CREATE TABLE questions (
    id TEXT PRIMARY KEY, track_id TEXT, topic TEXT, difficulty TEXT, question_type TEXT,
    prompt TEXT, options_json TEXT, answer_json TEXT, explanation TEXT,
    source_type TEXT, source_reference TEXT, language TEXT,
    exam_section TEXT, exam_section_method TEXT);
    CREATE TABLE question_review_state (question_id TEXT PRIMARY KEY, review_count INTEGER,
      correct_streak INTEGER, last_result TEXT, next_review_at TEXT, mastered INTEGER);
    CREATE TABLE study_attempts (id TEXT PRIMARY KEY, question_id TEXT,
      is_correct INTEGER, answered_at TEXT);`)
  const insert = sql.prepare(`INSERT INTO questions VALUES (?,?,?,'standard','single_choice',?,
    '[]','"a"','explanation',?,'https://www.ipa.go.jp/','ja',?,'explicit')`)
  insert.run('fe-ipa-official-2026-a-01','exam-fe','確率','probability','official','A')
  insert.run('fe-ipa-official-2026-a-07','exam-fe','SQL','sql','official','A')
  insert.run('fe-ipa-official-2026-b-02','exam-fe','FE算法与程序设计','program','official','B')
  insert.run('fe-ipa-official-2025-a-01','exam-fe','確率','older','official','A')
  insert.run('fe-ipa-adapt-2026-a-02','exam-fe','確率','adapted','licensed','A')
  insert.run('sg-demo-2026','exam-sg','確率','sg','official','A')
  insert.run('sg-official-2026-01','exam-sg','情報セキュリティ','sg-2026','official','A')
  insert.run('sg-official-r06-2024-q01','exam-sg','リスク管理','sg-2024','official','A')
  insert.run('sg-official-2019f-am-25','exam-sg','情報セキュリティ','sg-2019','official','A')
  insert.run('sg-official-h29a-2017-q01','exam-sg','リスク管理','sg-2017','official','A')
  insert.run('sg-b-case-001','exam-sg','情報資産管理','sg-case','generated','B')
  insert.run('sg-prediction-2026-001','exam-sg','情報セキュリティ','sg-pred','generated','A')
  return { sql, env: { DB: { prepare(query) { return { bind(...args) { return {
    all: async () => ({ results: sql.prepare(query).all(...args) }),
    first: async () => sql.prepare(query).get(...args),
  } } } } } } }
}

async function get(env, route) {
  const response = await worker.fetch(new Request('https://test.local' + route), env)
  return { status: response.status, body: await response.json() }
}

test('FE source, year, section and domain filters agree with counts and pagination', async () => {
  const { env } = setup()
  const route = '/api/questions?track=exam-fe&source=official&year=2026&section=A&topic=' +
    encodeURIComponent('確率') + '&mode=ordered'
  const result = await get(env, route)
  assert.equal(result.status, 200)
  assert.equal(result.body.total, 1)
  assert.deepEqual(result.body.items.map(x => x.id), ['fe-ipa-official-2026-a-01'])

  const all2026 = await get(env, '/api/questions?track=exam-fe&source=all&year=2026&section=A&mode=ordered')
  assert.equal(all2026.body.total, 3)
  const subjectB = await get(env, '/api/questions?track=exam-fe&year=2026&section=B')
  assert.equal(subjectB.body.total, 1)
  const older = await get(env, '/api/questions?track=exam-fe&year=2025&section=A')
  assert.equal(older.body.total, 1)
})

test('FE topic counts and unlearned review respect year and A/B classification', async () => {
  const { env } = setup()
  const subjects = await get(env, '/api/question-categories?track=exam-fe&source=official&year=2026&section=A')
  assert.equal(subjects.status, 200)
  assert.deepEqual(Object.fromEntries(subjects.body.items.map(x => [x.topic, x.question_count])),
    { SQL: 1, '確率': 1 })

  const review = await get(env, '/api/wrong-questions?track=exam-fe&source=official&year=2026&section=B&mode=unlearned')
  assert.equal(review.status, 200)
  assert.equal(review.body.total, 1)
  assert.deepEqual(review.body.items.map(x => x.id), ['fe-ipa-official-2026-b-02'])
})

test('legacy SG practice is unchanged when FE year/section params are not supplied', async () => {
  const { env } = setup()
  const result = await get(env, '/api/questions?track=exam-sg&source=official&mode=ordered')
  assert.equal(result.status, 200)
  assert.equal(result.body.total, 5)
})

test('SG year filters include official 2026 and legacy 2019/2017 papers, not predictions', async () => {
  const { env } = setup()
  for (const [year, expectedId] of [
    ['2026', 'sg-official-2026-01'],
    ['2024', 'sg-official-r06-2024-q01'],
    ['2019', 'sg-official-2019f-am-25'],
    ['2017', 'sg-official-h29a-2017-q01'],
  ]) {
    const response = await get(env, '/api/questions?track=exam-sg&source=all&year=' + year + '&mode=ordered')
    assert.equal(response.status, 200)
    assert.equal(response.body.total, 1, year)
    assert.deepEqual(response.body.items.map(x => x.id), [expectedId], year)
    assert.equal(response.body.items[0].source_type, 'official', year)
  }
  const generated = await get(env, '/api/questions?track=exam-sg&source=generated&year=2026')
  assert.equal(generated.body.total, 0, 'years must not attribute predictions to an IPA session')
})

test('SG topic categories, A/B section and learning-state reviews share the same filters', async () => {
  const { env } = setup()
  const topics = await get(env, '/api/question-categories?track=exam-sg&source=official&year=2026&section=A')
  assert.equal(topics.status, 200)
  assert.deepEqual(topics.body.items.map(x => [x.topic, x.question_count]), [['情報セキュリティ', 1]])
  const cases = await get(env, '/api/questions?track=exam-sg&source=generated&section=B&topic=' +
    encodeURIComponent('情報資産管理'))
  assert.equal(cases.status, 200)
  assert.deepEqual(cases.body.items.map(x => x.id), ['sg-b-case-001'])
  const wrong = await get(env, '/api/wrong-questions?track=exam-sg&source=official&year=2019&section=A&topic=' +
    encodeURIComponent('情報セキュリティ') + '&mode=unlearned')
  assert.equal(wrong.status, 200)
  assert.equal(wrong.body.total, 1)
  assert.deepEqual(wrong.body.items.map(x => x.id), ['sg-official-2019f-am-25'])
  const noCases = await get(env, '/api/question-categories?track=exam-sg&source=generated&section=A&year=2019')
  assert.deepEqual(noCases.body.items, [])
})

test('new SG year/section/domain selectors are visible beside the existing FE selector', async () => {
  const app = await readFile(new URL('../src/App.vue', import.meta.url), 'utf8')
  assert.match(app, /selectedTrackId === 'exam-sg' \? 'SG 年度' : 'FE 年度'/)
  assert.match(app, /selectedTrackId === 'exam-sg' \? 'SG 科目' : 'FE 科目'/)
  assert.match(app, /selectedTrackId === 'exam-sg' \? 'SG 领域' : 'FE 领域'/)
  assert.match(app, /科目 A（含旧午前题）/)
  assert.doesNotMatch(app, /2016〜2019年度は旧制度の午前問題です/)
  assert.doesNotMatch(app, /selectedTrackId === 'exam-fe'".*年度・科目・分野/)
})
