import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const migration = await readFile(new URL('../migrations/0079_language_learning_6000_cards.sql', import.meta.url), 'utf8')
const rows = migration.split('\n').filter(line => /^\s*\('[^']+', '(ja|en)', /.test(line))
const ja = rows.filter(line => /^\s*\('[^']+', 'ja', /.test(line))
const en = rows.filter(line => /^\s*\('[^']+', 'en', /.test(line))

test('language seed migration contains exactly 3,000 Japanese and 3,000 English cards', () => {
  assert.equal(rows.length, 6000)
  assert.equal(ja.length, 3000)
  assert.equal(en.length, 3000)
  assert.match(migration, /source_type/)
  assert.match(migration, /licensed/)
  assert.match(migration, /JLPT N5/)
  assert.match(migration, /英语核心词汇（1–1000）/)
  assert.match(migration, /英语扩展词汇（2001–3000）/)
})

test('language seed migration has no duplicate stable IDs', () => {
  const ids = rows.map(line => line.match(/^\s*\('([^']+)'/)?.[1]).filter(Boolean)
  assert.equal(ids.length, 6000)
  assert.equal(new Set(ids).size, 6000)
})
