import test from 'node:test'
import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
import { readFile, writeFile, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const dir = await mkdtemp(join(tmpdir(), 'vocab-auth-'))
const worker = (await readFile(new URL('../worker/index.ts', import.meta.url), 'utf8'))
  .replace("from './auth'", "from './auth.mts'")
  .replace("import { feSeeds, seedUrl } from './fe-question-bank'", "const feSeeds = []; const seedUrl = () => ''")
await writeFile(join(dir, 'index.mts'), worker)
await writeFile(join(dir, 'auth.mts'), await readFile(new URL('../worker/auth.ts', import.meta.url), 'utf8'))
const app = (await import(pathToFileURL(join(dir, 'index.mts')))).default
process.on('exit', () => { void rm(dir, { recursive: true, force: true }) })
const secret = 'a'.repeat(32)
const env = { AUTH_PASSWORD: 'b'.repeat(16), AUTH_SESSION_SECRET: secret, DB: { prepare() { throw new Error('unexpected database access') } } }
const payload = Buffer.from(JSON.stringify({v: 1, exp: Math.floor(Date.now()/1000) + 600})).toString('base64url')
const signature = createHmac('sha256', secret).update(payload).digest('base64url')
const cookie = `__Host-study_session=${payload}.${signature}`
test('personal vocabulary endpoints require a valid session', async () => {
  for (const method of ['GET', 'POST']) {
    const response = await app.fetch(new Request('https://study.test/api/vocabulary/saved', {method}), env)
    assert.equal(response.status, 401)
  }
})
test('authenticated cross-origin writes are rejected before touching D1', async () => {
  const response = await app.fetch(new Request('https://study.test/api/vocabulary/saved', {
    method: 'POST', headers: {cookie, origin: 'https://evil.test', 'content-type': 'application/json'},
    body: JSON.stringify({term:'a', action:'remove'})
  }), env)
  assert.equal(response.status, 403)
})
