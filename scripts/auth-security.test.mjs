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

test('personal data endpoints share the authentication gate', () => {
  for (const route of ['/api/dashboard', '/api/exam-history', '/api/attempts', '/api/scenario-attempts', '/api/language-progress', '/api/language-review', '/api/vocabulary/saved', '/api/daily-tasks', '/api/question-progress', '/api/wrong-questions', '/api/translate-explanation']) {
    assert.ok(worker.includes(route), `missing protected route: ${route}`)
  }
  assert.match(worker, /requireAuth\(request, env\)/)
})
