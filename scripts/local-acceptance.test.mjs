import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('local validation is non-destructive and validates all generated migrations', async () => {
  const script = await readFile(new URL('./check-local.sh', import.meta.url), 'utf8')
  for (const step of ['npm ci', 'generate_language_sentence_seed.py', 'generate_fe_practice_bank.mjs', 'npm run typecheck',
    'npm test', 'npm run build', 'd1 migrations apply it-study-platform-db --local']) {
    assert.ok(script.includes(step), step)
  }
  assert.doesNotMatch(script, /--remote|wrangler deploy(?! --dry-run)/)
})

test('production smoke checks cover both newly protected write routes', async () => {
  const workflow = await readFile(new URL('../.github/workflows/deploy-cloudflare.yml', import.meta.url), 'utf8')
  for (const route of ['/api/mock-exam/submit', '/api/fe-question-bank/install']) {
    assert.ok(workflow.includes("'POST', '"+route+"'"), route)
  }
})
