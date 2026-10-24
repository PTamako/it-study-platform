import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const auth = await readFile(new URL('../worker/auth.ts', import.meta.url), 'utf8')
const worker = await readFile(new URL('../worker/index.ts', import.meta.url), 'utf8')
const migration = await readFile(new URL('../migrations/0081_auth_login_rate_limits.sql', import.meta.url), 'utf8')

test('single-user auth uses hardened session cookies and expiry', () => {
  assert.match(auth, /HttpOnly; Secure; SameSite=Strict/)
  assert.match(auth, /SESSION_SECONDS = 12 \* 60 \* 60/)
  assert.match(auth, /AUTH_SESSION_SECRET/)
  assert.match(auth, /AUTH_PASSWORD/)
})

test('login checks same-origin and throttles failures in D1', () => {
  assert.match(auth, /sameOrigin\(request, url\)/)
  assert.match(auth, /LOGIN_MAX_FAILURES = 5/)
  assert.match(auth, /auth_login_rate_limits/)
  assert.match(auth, /auth_write_rate_limits/)
  assert.match(auth, /at most 60 state-changing personal API requests per client per minute/)
  assert.match(auth, /DELETE FROM auth_write_rate_limits WHERE expires_at <= \?/)
  assert.match(migration, /CREATE TABLE IF NOT EXISTS auth_login_rate_limits/)
  assert.match(migration, /CREATE TABLE IF NOT EXISTS auth_write_rate_limits/)
})

test('every personal data endpoint is explicitly registered behind the auth gate', () => {
  const expectedProtectedRoutes = [
    '/api/dashboard',
    '/api/exam-history',
    '/api/attempts',
    '/api/scenario-attempts',
    '/api/language-progress',
    '/api/language-review',
    '/api/vocabulary/saved',
    '/api/daily-tasks',
    '/api/question-progress',
    '/api/wrong-questions',
    '/api/translate-explanation',
  ]
  const protectedBlock = worker.match(/const protectedPersonalPaths = new Set\(\[([\s\S]*?)\]\)/)
  assert.ok(protectedBlock, 'protectedPersonalPaths set must exist')
  const registeredRoutes = [...protectedBlock[1].matchAll(/['"]([^'"]+)['"]/g)].map(match => match[1])
  for (const route of expectedProtectedRoutes) {
    assert.ok(registeredRoutes.includes(route), `personal endpoint is not protected: ${route}`)
  }
  assert.match(worker, /if \(protectedPersonalPaths\.has\(url\.pathname\)\) \{\s*const authFailure = await requireAuth\(request, env\)/)
  assert.ok(
    worker.indexOf('if (protectedPersonalPaths.has(url.pathname))') < worker.indexOf("if (url.pathname === '/api/dashboard'"),
    'auth gate must run before personal endpoint handlers',
  )
})

const app = await readFile(new URL('../src/App.vue', import.meta.url), 'utf8')

test('destructive exam history deletion requires typed second confirmation', () => {
  const start = app.indexOf('async function removeExamRecords()')
  assert.notEqual(start, -1, 'exam history delete handler must exist')
  const end = app.indexOf('\n}', start)
  const handler = app.slice(start, end)
  const firstConfirm = handler.indexOf('window.confirm(')
  const typedConfirm = handler.indexOf("window.prompt('二次确认")
  const deleteRequest = handler.indexOf("fetch('/api/exam-history', { method: 'DELETE' })")
  assert.ok(firstConfirm >= 0, 'first confirmation must be present')
  assert.ok(typedConfirm > firstConfirm, 'typed confirmation must follow first confirmation')
  assert.ok(deleteRequest > typedConfirm, 'DELETE request must occur only after both confirmations')
  assert.match(handler, /confirmation !== '清除'/)
})
