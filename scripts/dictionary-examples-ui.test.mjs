import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const app = await readFile(new URL('../src/App.vue', import.meta.url), 'utf8')
const css = await readFile(new URL('../src/style.css', import.meta.url), 'utf8')

test('dictionary examples stay one compact row and still search four languages', () => {
  const start = app.indexOf('class="dictionary-quick-start"')
  const end = app.indexOf('</div>', start)
  assert.ok(start !== -1 && end > start)
  const examples = app.slice(start, end)
  assert.equal((examples.match(/quickDictionarySearch\(/g) || []).length, 4)
  for (const entry of [
    "quickDictionarySearch('你好', 'zh')",
    "quickDictionarySearch('hello', 'en')",
    "quickDictionarySearch('こんにちは', 'ja')",
    "quickDictionarySearch('API', 'it')",
  ]) assert.ok(examples.includes(entry), entry)
  assert.doesNotMatch(examples, /<small>|トランザクション|Cloudflare D1|プルリクエスト/)
  assert.match(css, /\.dictionary-quick-start\{[^}]*flex-wrap:nowrap/)
  assert.match(css, /\.dictionary-quick-start button\{[^}]*border:0/)
  assert.match(css, /\.dictionary-quick-start button:focus-visible/)
})
