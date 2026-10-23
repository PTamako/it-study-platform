import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const migration = await readFile(new URL('../migrations/0081_language_sentence_cards.sql', import.meta.url), 'utf8')
const rows = migration.split('\n').filter(line => /^\s*\('(ja|en)-sentence-/.test(line))
const ja = rows.filter(line => /^\s*\('ja-sentence-/.test(line))
const en = rows.filter(line => /^\s*\('en-sentence-/.test(line))

test('sentence curriculum contains exactly 3,000 Japanese and 3,000 English sentences', () => {
  assert.equal(rows.length, 6000)
  assert.equal(ja.length, 3000)
  assert.equal(en.length, 3000)
  assert.match(migration, /日常句子/)
  assert.match(migration, /职场语言/)
  assert.match(migration, /highlight_json/)
  assert.match(migration, /vocabulary_expansion_json/)
  assert.match(migration, /grammar_expansion_json/)
  assert.match(migration, /source_url/)
  assert.match(migration, /Tatoeba/)
})

test('sentence curriculum has stable unique IDs and only the two requested categories', () => {
  const ids = rows.map(line => line.match(/^\s*\('([^']+)'/)?.[1]).filter(Boolean)
  assert.equal(ids.length, 6000)
  assert.equal(new Set(ids).size, 6000)
  for (const line of rows) {
    assert.match(line, /'日常句子'|'职场语言'/)
    assert.match(line, /'sentence'/)
  }
})
