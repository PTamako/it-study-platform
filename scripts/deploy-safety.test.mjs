import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
const workflow = readFileSync(new URL('../.github/workflows/deploy-cloudflare.yml', import.meta.url),'utf8')
test('production D1 bookmark gate runs before any remote migration',()=>{
  const capture=workflow.indexOf('Capture production D1 pre-migration recovery bookmark')
  const archive=workflow.indexOf('Archive pre-migration recovery bookmark')
  const apply=workflow.indexOf('Apply reviewed D1 migrations')
  assert.ok(capture>0 && archive>capture && apply>archive)
  assert.match(workflow,/d1 time-travel info it-study-platform-db --json/)
  assert.match(workflow,/if-no-files-found: error/)
  assert.doesNotMatch(workflow,/d1 time-travel restore/)
})

test('only merged PR commits are automatically deployed from main',()=>{
  assert.match(workflow,/pull-requests: read/)
  assert.match(workflow,/Refuse production deployment for unreviewed direct pushes/)
  assert.match(workflow,/pr\.merge_commit_sha === process\.env\.SHA/)
  assert.ok(workflow.indexOf('Refuse production deployment') < workflow.indexOf('Install locked dependencies'))
})
