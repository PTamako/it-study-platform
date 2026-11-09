import { inlineChineseDictionary } from './inline-chinese-dictionary.mjs'
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { DatabaseSync } from 'node:sqlite'
import ts from 'typescript'

const source = (await readFile(new URL('../worker/index.ts', import.meta.url), 'utf8'))
  .replace("import { checkWriteRateLimit, handleAuthRequest, requireAuth } from './auth'",
    'const checkWriteRateLimit = async () => null; const handleAuthRequest = async () => null; const requireAuth = async () => null')
  .replace("import { feSeeds, seedUrl } from './fe-question-bank'", 'const feSeeds = []; const seedUrl = () => ""')
const js = ts.transpile(inlineChineseDictionary(source), { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext })
const worker = (await import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'))).default
const migration = readFileSync(new URL('../migrations/0128_indexed_mock_draw_pool.sql', import.meta.url), 'utf8')

function rows(n, section, topic, opts = {}) {
  return Array.from({ length: n }, (_, i) => ({
    id: `${section}-${topic}-${opts.source || 'all'}-${i}`,
    track_id: opts.track || 'exam-fe',
    exam_section: section, exam_section_method: opts.method || 'explicit',
    topic, source_type: opts.source || 'generated',
    question_kind: opts.kind || 'standard', exam_origin: opts.origin || 'general',
  }))
}
function setup(records = []) {
  const sql = new DatabaseSync(':memory:')
  sql.exec(`PRAGMA foreign_keys=ON;
    CREATE TABLE questions (
      id TEXT PRIMARY KEY, track_id TEXT NOT NULL, topic TEXT NOT NULL,
      difficulty TEXT DEFAULT 'standard', question_type TEXT DEFAULT 'single_choice',
      prompt TEXT, options_json TEXT, answer_json TEXT, explanation TEXT,
      source_type TEXT NOT NULL, source_reference TEXT, language TEXT DEFAULT 'ja',
      exam_section TEXT, exam_section_method TEXT, question_kind TEXT DEFAULT 'standard',
      exam_origin TEXT DEFAULT 'general'
    );`)
  const insert = sql.prepare(`INSERT INTO questions
    (id,track_id,topic,prompt,options_json,answer_json,explanation,
     source_type,source_reference,exam_section,exam_section_method,question_kind,exam_origin)
    VALUES (?,?,?,'prompt','[{"id":"a","text":"yes"}]','"a"','SECRET-KEY-EXPLANATION',
            ?,'https://www.ipa.go.jp/',?,?,?,?)`)
  for (const row of records) {
    insert.run(row.id,row.track_id,row.topic,row.source_type,row.exam_section,
      row.exam_section_method,row.question_kind,row.exam_origin)
  }
  sql.exec(migration)
  const measures = { queries: 0, materialized: 0, sql: [] }
  const env = { DB: { prepare(query) {
    measures.queries++
    measures.sql.push(query)
    return { bind(...args) { return {
      all: async () => {
        const results = sql.prepare(query).all(...args)
        measures.materialized += results.length
        return { results }
      },
      first: async () => sql.prepare(query).get(...args) || null,
    } } }
  } } }
  const run = async query => {
    const response = await worker.fetch(new Request('https://test.local/api/mock-exam-questions?' + query), env)
    return { status: response.status, data: await response.json() }
  }
  return { sql, run, measures }
}

test('FE 科目 A draws 60/90m without loading other row payloads or answer keys', async () => {
  const fixture = setup([...rows(800,'A','知識'), ...rows(600,'A','SG',{track:'exam-sg'})])
  try {
    const { status, data } = await fixture.run('track=exam-fe&section=A')
    assert.equal(status,200)
    assert.equal(data.items.length,60)
    assert.equal(data.duration_minutes,90)
    assert.equal(new Set(data.items.map(x => x.id)).size,60)
    assert.ok(data.items.every(x => x.track_id === 'exam-fe' && x.exam_section === 'A'))
    assert.ok(data.items.every(x => !Object.hasOwn(x,'answer') && !Object.hasOwn(x,'answer_json') && !Object.hasOwn(x,'explanation')))
    assert.ok(fixture.measures.materialized <= 60, 'full table must not be read into Worker')
    assert.ok(fixture.measures.queries <= 2, 'bounded draw uses one random seek and optional wrap')
    assert.ok(fixture.measures.sql.every(x => !/q\.answer_json|q\.explanation/.test(x)))
  } finally {fixture.sql.close()}
})

test('FE 科目 B preserves a 16 algorithm / 4 security exam at 100 minutes', async () => {
  const fixture = setup([...rows(45,'B','FE算法与程序设计'), ...rows(21,'B','FE信息安全'),
    ...rows(300,'A','知識')])
  try {
    const { status,data } = await fixture.run('track=exam-fe&section=B')
    assert.equal(status,200)
    assert.equal(data.items.length,20)
    assert.equal(data.duration_minutes,100)
    assert.equal(data.items.filter(x=>x.topic==='FE算法与程序设计').length,16)
    assert.equal(data.items.filter(x=>x.topic==='FE信息安全').length,4)
    assert.equal(data.distribution.approximate,true)
    assert.ok(fixture.measures.materialized<=20)
    assert.ok(fixture.measures.queries<=4)
  } finally {fixture.sql.close()}
})

test('insufficient and inferred FE questions remain rejected with accurate counts',async()=>{
  for(const [questionRows,query] of [
    [rows(59,'A','知識'),'track=exam-fe&section=A'],
    [rows(60,'A','知識',{method:'default_a'}),'track=exam-fe&section=A'],
    [[...rows(15,'B','FE算法与程序设计'), ...rows(10,'B','FE信息安全')],'track=exam-fe&section=B'],
  ]) {
    const f=setup(questionRows)
    try{const x=await f.run(query);assert.equal(x.status,409);assert.match(x.data.error,/需要/)}
    finally{f.sql.close()}
  }
  const empty=setup([])
  try{
    assert.equal((await empty.run('track=exam-fe')).status,400)
    assert.equal((await empty.run('track=exam-ap')).status,400)
  }finally{empty.sql.close()}
})

test('SG draws exact 48 A / 12 B and does not use FE classifications',async()=>{
  const f=setup([...rows(90,'A','SG',{track:'exam-sg'}), ...rows(40,'B','SG',{track:'exam-sg'}),
    ...rows(200,'A','FE',{track:'exam-fe'})])
  try {
    const {status,data}=await f.run('track=exam-sg')
    assert.equal(status,200)
    assert.equal(data.items.length,60)
    assert.deepEqual(data.section_counts,{A:48,B:12})
    assert.equal(data.duration_minutes,120)
    assert.ok(data.items.every(x=>x.track_id==='exam-sg'))
    assert.ok(f.measures.materialized<=60)
    assert.ok(f.measures.queries<=4)
  }finally{f.sql.close()}
})

test('source type and exemption filter remain isolated when drawn by indexed seek',async()=>{
  const f=setup([
    ...rows(68,'A','official',{source:'official'}),
    ...rows(70,'A','sample',{source:'licensed',kind:'official_sample'}),
    ...rows(64,'A','exemption',{source:'licensed',origin:'fe_exemption'}),
    ...rows(66,'A','adapted',{source:'licensed'}),
  ])
  try{
    for(const [source,expected] of [['official','official'],['sample','sample'],['exemption','exemption'],['licensed','adapted']]){
      const {status,data}=await f.run('track=exam-fe&section=A&source='+source)
      assert.equal(status,200,source)
      assert.equal(data.items.length,60,source)
      assert.ok(data.items.every(x=>x.topic===expected),source)
    }
    assert.equal((await f.run('track=exam-fe&section=A&source=generated')).status,409)
  }finally{f.sql.close()}
})

test('one-time migration preserves personal records, tracks future inserts/updates/deletes and is idempotent',()=>{
  const f=setup(rows(2,'A','knowledge'))
  try{
    const count=()=>f.sql.prepare('SELECT COUNT(*) n FROM mock_question_pool').get().n
    assert.equal(count(),2)
    f.sql.exec("CREATE TABLE study_attempts (id TEXT PRIMARY KEY,question_id TEXT);INSERT INTO study_attempts VALUES ('keep','A-knowledge-all-0')")
    const key=f.sql.prepare("SELECT draw_key FROM mock_question_pool WHERE question_id='A-knowledge-all-0'").get().draw_key
    f.sql.exec(migration)
    assert.equal(count(),2)
    assert.equal(f.sql.prepare("SELECT draw_key FROM mock_question_pool WHERE question_id='A-knowledge-all-0'").get().draw_key,key)
    assert.equal(f.sql.prepare("SELECT COUNT(*) n FROM study_attempts").get().n,1)
    f.sql.exec(`INSERT INTO questions(id,track_id,topic,source_type,exam_section,exam_section_method)
       VALUES('new-fe','exam-fe','new category','generated','A','explicit')`)
    assert.equal(count(),3)
    f.sql.exec("UPDATE questions SET exam_section='B',topic='FE算法与程序设计' WHERE id='new-fe'")
    const updated=f.sql.prepare("SELECT exam_section,topic FROM mock_question_pool WHERE question_id='new-fe'").get()
    assert.equal(updated.exam_section,'B');assert.equal(updated.topic,'FE算法与程序设计')
    f.sql.exec("DELETE FROM questions WHERE id='new-fe'")
    assert.equal(count(),2)
    const plan=f.sql.prepare(`EXPLAIN QUERY PLAN SELECT p.question_id FROM mock_question_pool p
      WHERE p.track_id='exam-fe' AND p.exam_section='A' AND p.draw_key>=100
      ORDER BY p.draw_key,p.question_id LIMIT 60`).all()
    assert.ok(plan.some(x=>String(x.detail).includes('idx_mock_pool_section_draw')),JSON.stringify(plan))
  }finally{f.sql.close()}
})


test('FE B official 2022 samples participate in mock draws without changing their precise study topics', async () => {
  const mkSample = (id, topic) => ({
    id, track_id: 'exam-fe', exam_section: 'B', exam_section_method: 'explicit',
    topic, source_type: 'licensed', question_kind: 'official_sample', exam_origin: 'general',
  })
  const algorithm = [
    ...Array.from({ length: 5 }, (_, i) => mkSample('fe-ipa-sample-2022-april-b-' + String(i + 1).padStart(3, '0'), '数组/条件细分题目')),
    ...Array.from({ length: 16 }, (_, i) => mkSample('fe-ipa-sample-2022-b-' + String(i + 1).padStart(3, '0'), '算法细分题目')),
  ]
  const security = [
    mkSample('fe-ipa-sample-2022-april-b-006', 'PaaS・脆弱性責任'),
    ...Array.from({ length: 4 }, (_, i) => mkSample('fe-ipa-sample-2022-b-' + String(i + 17).padStart(3, '0'), '风险细分题目')),
  ]
  const f = setup([...algorithm, ...security])
  try {
    const { status, data } = await f.run('track=exam-fe&section=B&source=sample')
    assert.equal(status, 200)
    assert.equal(data.items.length, 20)
    assert.equal(data.items.filter(item => security.some(s => s.id === item.id)).length, 4)
    assert.equal(data.items.filter(item => algorithm.some(s => s.id === item.id)).length, 16)
    assert.ok(data.items.every(item => item.question_kind === 'official_sample'))
    assert.ok(f.measures.materialized <= 20)
    const oldOnly = setup([...rows(50, 'B', 'FE算法与程序设计'), ...rows(20, 'B', 'FE信息安全')])
    try { assert.equal((await oldOnly.run('track=exam-fe&section=B')).status, 200) }
    finally { oldOnly.sql.close() }
    const unknown = setup([...rows(15,'B','FE算法与程序设计'),
      mkSample('fe-ipa-sample-2023-b-001', '未经审查的新样题'), ...rows(5,'B','FE信息安全')])
    try { assert.equal((await unknown.run('track=exam-fe&section=B')).status, 409) }
    finally { unknown.sql.close() }
  } finally { f.sql.close() }
})


test('SG timed mock excludes the verified historical mirror without deleting either official question',async()=>{
  const historical = { id:'sg-official-h29a-2017-q31',track_id:'exam-sg',
    exam_section:'A',exam_section_method:'default_a',topic:'privacy',
    source_type:'official',question_kind:'standard',exam_origin:'general' }
  const modern = { ...historical,id:'sg-official-r06-2024-q07' }
  const f=setup([...rows(85,'A','SG',{track:'exam-sg'}), ...rows(35,'B','SG',{track:'exam-sg'}),
    historical,modern])
  try {
    const recorded=f.sql.prepare('SELECT COUNT(*) n FROM questions WHERE id IN (?,?)')
      .get(historical.id,modern.id).n
    assert.equal(recorded,2,'both source-backed questions must remain in the learning bank')
    for(let i=0;i<5;i++){
      const {status,data}=await f.run('track=exam-sg&source=official')
      // Other fixture SG rows are generated, so official-only cannot form a mock.
      assert.equal(status,409)
      const full=await f.run('track=exam-sg')
      assert.equal(full.status,200)
      assert.equal(full.data.items.length,60)
      assert.ok(!full.data.items.some(item=>item.id===historical.id))
    }
  } finally {f.sql.close()}
})
