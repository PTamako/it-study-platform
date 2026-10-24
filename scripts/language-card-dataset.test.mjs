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

function parseSqlTuple(line) {
  const fields = []
  let i = line.indexOf('(') + 1
  while (i > 0 && i < line.length) {
    while (/\s/.test(line[i] || '')) i++
    if (line[i] !== "'") throw new Error('Expected SQL string field in: ' + line.slice(0, 80))
    i++
    let value = ''
    let closed = false
    while (i < line.length) {
      if (line[i] === "'" && line[i + 1] === "'") {
        value += "'"
        i += 2
      } else if (line[i] === "'") {
        i++
        closed = true
        break
      } else {
        value += line[i++]
      }
    }
    if (!closed) throw new Error('Unterminated SQL string in sentence migration')
    fields.push(value)
    if (line[i] === ',') { i++; continue }
    if (line[i] === ')' || line[i] === ';') break
    if (/\\s/.test(line[i] || '')) { i++; continue }
    throw new Error('Unexpected SQL tuple delimiter: ' + line.slice(i, i + 20))
  }
  return fields
}

test('every sentence card has usable translations, grounded highlights, and vocabulary/grammar expansion', () => {
  let grammarHighlighted = 0
  for (const line of rows) {
    const fields = parseSqlTuple(line)
    assert.equal(fields.length, 16, 'each card must include all expected fields')
    const [id, language, category, sentence, , meaningZh, , , , , sourceType, contentType, sourceUrl, highlightJson, vocabularyJson, grammarJson] = fields
    assert.ok(sentence.trim().length >= 4, id + ': sentence must not be empty')
    assert.ok(meaningZh.trim().length > 0, id + ': Chinese meaning must not be empty')
    assert.match(sourceUrl, /^https:\/\/tatoeba\.org\/en\/sentences\/show\//)
    assert.equal(sourceType, 'licensed')
    assert.equal(contentType, 'sentence')
    const highlights = JSON.parse(highlightJson)
    const vocabulary = JSON.parse(vocabularyJson)
    const grammar = JSON.parse(grammarJson)
    assert.ok(Array.isArray(highlights), id + ': highlights must be an array')
    assert.ok(highlights.some(hit => hit.type === 'vocabulary'), id + ': must have a vocabulary highlight')
    assert.ok(vocabulary.length > 0, id + ': vocabulary expansion must not be empty')
    assert.ok(grammar.length > 0, id + ': grammar study expansion must not be empty')
    if (highlights.some(hit => hit.type === 'grammar')) grammarHighlighted++
    for (const hit of highlights) {
      assert.ok(Number.isInteger(hit.start) && Number.isInteger(hit.end), id + ': highlight offsets must be integers')
      assert.ok(hit.start >= 0 && hit.end > hit.start && hit.end <= sentence.length, id + ': highlight offsets must be in range')
      assert.equal(sentence.slice(hit.start, hit.end), hit.term, id + ': highlight must match the exact sentence substring')
    }
  }
  assert.ok(grammarHighlighted > 0, 'at least some cards must contain directly highlighted grammar patterns')
})
