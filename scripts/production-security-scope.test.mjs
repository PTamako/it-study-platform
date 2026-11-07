import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const worker = readFileSync(new URL('../worker/index.ts', import.meta.url),'utf8')
const workflow = readFileSync(new URL('../.github/workflows/deploy-cloudflare.yml', import.meta.url),'utf8')
const block = worker.match(/const protectedPersonalPaths = new Set\(\[([\s\S]*?)\]\)/)?.[1] || ''
const paths = [...block.matchAll(/'\/api\/[^']+'/g)].map(m => m[0].slice(1,-1))

test('production smoke derives all protected GET and write paths from code',()=>{
  assert.ok(paths.length >= 25)
  assert.match(workflow,/const protectedReads = \[\.\.\.new Set\(paths\(protectedBlock\)\)\]/)
  assert.match(workflow,/const protectedWrites = \[\.\.\.new Set\(paths\(writeBlock\)\)\]/)
  assert.match(workflow,/Write endpoint not protected/)
  assert.match(workflow,/if \(response\.status !== 401\)/)
  for (const route of ['/api/daily-word-reviews','/api/questions','/api/mock-exam-questions','/api/tracks','/api/language-cards'])
    assert.ok(paths.includes(route),route)
})
