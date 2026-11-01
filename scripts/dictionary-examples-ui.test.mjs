import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const app = await readFile(new URL('../src/App.vue', import.meta.url), 'utf8')
const css = await readFile(new URL('../src/style.css', import.meta.url), 'utf8')

test('production dictionary omits sample-search shortcuts and their dead styles', () => {
  assert.doesNotMatch(app, /dictionary-quick-start|quickDictionarySearch|快捷查词示例/)
  assert.doesNotMatch(css, /dictionary-quick-start/)
})

test('ordinary dictionary search, language selection and saved vocabulary remain available', () => {
  assert.match(app, /async function lookupDictionary\(\)/)
  assert.match(app, /@click="lookupDictionary"/)
  assert.match(app, /dictSourceLang/)
  assert.match(app, /savedVocabularyEntries/)
})
