import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('accepted dictionary no longer shows demonstration searches, while search inputs remain', async () => {
  const vue = await readFile(new URL('../src/App.vue', import.meta.url), 'utf8')
  const css = await readFile(new URL('../src/style.css', import.meta.url), 'utf8')
  assert.doesNotMatch(vue, /dictionary-quick-start|quickDictionarySearch/)
  assert.doesNotMatch(css, /dictionary-quick-start/)
  assert.match(vue, /@click="lookupDictionary"/)
  assert.match(vue, /dictSourceLang/)
  assert.match(vue, /dictionaryView/)
})
