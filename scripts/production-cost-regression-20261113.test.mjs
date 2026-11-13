import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { recordsMissingOnCloud } from '../src/exam-history-sync.ts'

test('historical exam records already in D1 do not trigger repeat POSTs', () => {
  const local = [{id:'a',score:80},{id:'b',score:90}]
  assert.deepEqual(recordsMissingOnCloud(local, [{id:'a'},{id:'b'}]), [])
  assert.deepEqual(recordsMissingOnCloud(local, [{id:'b'}]), [local[0]])
  assert.deepEqual(recordsMissingOnCloud([{id:'a'},{id:'a'},{id:'b'}], [{id:'b'}]), [{id:'a'}])
  assert.deepEqual(recordsMissingOnCloud([{score:1},{id:''}], []), [])
})

test('UI fetches remote IDs before uploading and verifies only real new writes', async () => {
  const app=await readFile(new URL('../src/App.vue',import.meta.url),'utf8')
  const start=app.indexOf('async function syncExamHistory()')
  const end=app.indexOf('async function saveExamRecord(',start)
  const code=app.slice(start,end)
  assert.ok(code.indexOf("fetch('/api/exam-history', { cache: 'no-store' })") < code.indexOf("method: 'POST'"))
  assert.match(code,/recordsMissingOnCloud\(localRecords, initial\.items\)/)
  assert.match(code,/if \(uploaded && !uploadFailed\)/)
  assert.match(code,/if \(!uploadFailed\) \{[\s\S]*mergeExamHistory/)
  assert.match(code,/原始记录仍保留在本设备/)
})

test('dictionary anonymous limiter remains enabled but authenticated owner skips its D1 writes', async () => {
  const code=await readFile(new URL('../worker/index.ts',import.meta.url),'utf8')
  const start=code.indexOf("if (url.pathname === '/api/dictionary') {")
  const end=code.indexOf("if (url.pathname === '/api/language-cards')",start)
  const handler=code.slice(start,end)
  assert.match(handler,/const ownerSession = !\(await requireAuth\(request, env\)\)/)
  assert.match(handler,/if \(!ownerSession\) \{\s*const quotaFailure = await checkPublicDictionaryQuota/)
  assert.match(handler,/ownerSession && env\.GAS_TRANSLATOR_URL && env\.GAS_TRANSLATOR_TOKEN/)
  assert.match(code,/RETURNING requests/)
})

test('every fallback Workers AI explanation translation reserves the same daily D1 budget', async () => {
  const code=await readFile(new URL('../worker/index.ts',import.meta.url),'utf8')
  assert.match(code,/async function reserveTranslationAiFallback\(env: Env\)/)
  assert.match(code,/dictionary_ai_daily_usage \(study_date, used\)/)
  assert.match(code,/used = used \+ 1 WHERE used < \? RETURNING used/)
  assert.match(code,/if \(!translated && ai && reserveAi && await reserveAi\(\)\)/)
  assert.match(code,/reserveTranslationAiFallback\(env\)/)
  assert.match(code,/Never perform unmetered inference/)
})

test('authenticated write quota cleanup is amortized while retaining atomic admission', async () => {
  const code=await readFile(new URL('../worker/auth.ts',import.meta.url),'utf8')
  const begin=code.indexOf('export async function checkWriteRateLimit(')
  const handler=code.slice(begin)
  const admission=handler.indexOf('RETURNING requests')
  const cleanup=handler.indexOf('DELETE FROM auth_write_rate_limits WHERE expires_at <= ?')
  assert.ok(admission>=0 && cleanup>admission)
  assert.match(handler,/if \(Number\(row\?\.requests\) === 1\)/)
  assert.match(handler,/if \(Number\(row\?\.requests \|\| 0\) > 60\)/)
})
