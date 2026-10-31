import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import ts from 'typescript'
const source = (await readFile(new URL('../worker/index.ts', import.meta.url), 'utf8')).replace("import { checkWriteRateLimit, handleAuthRequest, requireAuth } from './auth'", 'const checkWriteRateLimit = async () => null; const handleAuthRequest = async () => null; const requireAuth = async () => null')
const normalized = source.replace("import { feSeeds, seedUrl } from './fe-question-bank'", 'const feSeeds = []; const seedUrl = () => ""')
const js = ts.transpile(normalized, { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext })
const worker = (await import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'))).default
function rows(n, section, topic) { return Array.from({ length: n }, (_, i) => ({ id: `${section}-${topic}-${i}`, exam_section: section, exam_section_method: 'explicit', topic, options_json: '[]', answer_json: '"a"' })) }
async function run(query, records = []) {
  const db = { prepare() { return { bind() { return { all: async () => ({ results: records }) } } } } }
  const response = await worker.fetch(new Request('https://test.local/api/mock-exam-questions?' + query), { DB: db })
  return { status: response.status, data: await response.json() }
}
test('FE科目A is a separate 60-question 90-minute exam', async () => {
  const { status, data } = await run('track=exam-fe&section=A', rows(65, 'A', '知識'))
  assert.equal(status, 200); assert.equal(data.items.length, 60); assert.equal(data.duration_minutes, 90); assert.ok(data.items.every(x => x.exam_section === 'A'))
  assert.ok(data.items.every(x => !Object.hasOwn(x, 'answer') && !Object.hasOwn(x, 'explanation')), 'unsubmitted exam must not leak answer keys or explanations')
})
test('FE科目B is a separate 20-question 100-minute exam with approximate 16/4 mix', async () => {
  const { status, data } = await run('track=exam-fe&section=B', [...rows(18, 'B', 'FE算法与程序设计'), ...rows(6, 'B', 'FE信息安全')])
  assert.equal(status, 200); assert.equal(data.items.length, 20); assert.equal(data.duration_minutes, 100)
  assert.equal(data.items.filter(x => x.topic === 'FE算法与程序设计').length, 16); assert.equal(data.items.filter(x => x.topic === 'FE信息安全').length, 4); assert.equal(data.distribution.approximate, true)
})
test('insufficient, inferred or missing FE classification is rejected', async () => {
  assert.equal((await run('track=exam-fe&section=A', rows(59, 'A', '知識'))).status, 409)
  const inferred = rows(60, 'A', '知識').map(row => ({ ...row, exam_section_method: 'default_a' }))
  assert.equal((await run('track=exam-fe&section=A', inferred)).status, 409)
  assert.equal((await run('track=exam-fe&section=B', [...rows(15, 'B', 'FE算法与程序设计'), ...rows(10, 'B', 'FE信息安全')])).status, 409)
  assert.equal((await run('track=exam-fe')).status, 400)
  assert.equal((await run('track=exam-ap')).status, 400)
})
test('SG keeps its existing 48/12 mock selection', async () => {
  const { status, data } = await run('track=exam-sg', [...rows(50, 'A', 'SG'), ...rows(15, 'B', 'SG')])
  assert.equal(status, 200); assert.equal(data.items.length, 60); assert.deepEqual(data.section_counts, { A: 48, B: 12 }); assert.equal(data.duration_minutes, 120)
})
