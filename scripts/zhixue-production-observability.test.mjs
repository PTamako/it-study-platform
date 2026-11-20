import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const config = readFileSync(new URL('../wrangler.toml', import.meta.url), 'utf8')
const section = name => {
  const start = config.indexOf('[' + name + ']')
  assert.notEqual(start, -1, 'missing TOML section: ' + name)
  const tail = config.slice(start + name.length + 2)
  return tail.split(/\n\s*\[/, 1)[0]
}

test('production worker stays single, preview-free and bound to existing D1', () => {
  assert.match(config, /^name\s*=\s*"it-study-platform"$/m)
  assert.match(config, /^preview_urls\s*=\s*false$/m)
  assert.match(section('assets'), /run_worker_first\s*=\s*\["\/api\/\*"\]/)
  assert.match(config, /database_id\s*=\s*"ed4ca935-5d00-4f38-b3c5-c0d53c5aad63"/)
  assert.match(config, /DOCUMENT_STUDY_EXECUTION_ENABLED\s*=\s*"false"/)
})

test('production diagnostics are low-sample, query-redacted, and issue-aware', () => {
  const obs = section('observability')
  const logs = section('observability.logs')
  const issues = section('observability.issues')
  assert.match(obs, /enabled\s*=\s*true/)
  assert.match(obs, /head_sampling_rate\s*=\s*0\.1/)
  assert.match(obs, /redact_query_string\s*=\s*true/)
  assert.match(logs, /enabled\s*=\s*true/)
  assert.match(logs, /invocation_logs\s*=\s*true/)
  assert.match(logs, /head_sampling_rate\s*=\s*0\.1/)
  assert.match(issues, /enabled\s*=\s*true/)
})
