import { readFileSync } from 'node:fs'

// Intended for: wrangler d1 execute ... --json | node scripts/check-question-json.mjs
// Fail closed on bad CLI output rather than reporting an unverified pass.
const raw = readFileSync(0, 'utf8')
let payload
try {
  const start = raw.search(/\[\s*\{/)
  if (start < 0) throw new Error('No D1 JSON results present')
  payload = JSON.parse(raw.slice(start))
} catch (error) {
  console.error('Cannot parse D1 integrity query output:', String(error))
  process.exit(1)
}
const result = payload?.[0]?.results?.[0]
const bad = result?.invalid_count
if (typeof bad !== 'number' || !Number.isInteger(bad) || bad !== 0) {
  console.error('Question-bank JSON integrity gate failed:', result)
  process.exit(1)
}
console.log('Question-bank JSON integrity: 0 invalid answers/options or blank prompts/explanations')
