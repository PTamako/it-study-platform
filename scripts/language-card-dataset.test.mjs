import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const migration = await readFile(new URL('../migrations/0081_language_sentence_cards.sql', import.meta.url), 'utf8')
const refreshMigration = await readFile(new URL('../migrations/0084_refresh_contextual_bilingual_annotations.sql', import.meta.url), 'utf8')
const refreshStatements = refreshMigration.split('\n').filter(line => /^UPDATE language_cards SET highlight_json = /.test(line))
const rows = migration.split('\n').filter(line => /^\s*\('(ja|en)-sentence-/.test(line))
const ja = rows.filter(line => /^\s*\('ja-sentence-/.test(line))
const en = rows.filter(line => /^\s*\('en-sentence-/.test(line))

test('latest annotation refresh migration repairs existing production rows for all 6,000 cards', () => {
  assert.equal(refreshStatements.length, 6000)
  assert.match(refreshMigration, /highlight_json = /)
  assert.match(refreshMigration, /vocabulary_expansion_json = /)
  assert.match(refreshMigration, /grammar_expansion_json = /)
  assert.match(refreshMigration, /content_type = 'sentence'/)
})


test('Japanese travel sentence uses meaningful vocabulary and grammar instead of highlighting です as vocabulary', () => {
  const generator = readFile(new URL('./generate_language_sentence_seed.py', import.meta.url), 'utf8')
  return generator.then(source => {
    assert.match(source, /\("旅行","旅行、旅游"/)
    assert.match(source, /\(r"が楽しみです","N が楽しみです"/)
    assert.doesNotMatch(source, /\("です","是／为","礼貌体判断表达"\)/)
  })
})

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
    if (/\s/.test(line[i] || '')) { i++; continue }
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
    assert.ok(highlights.some(hit => hit.type === 'grammar'), id + ': must have a grammar/structure highlight')
    assert.ok(vocabulary.length > 0, id + ': vocabulary expansion must not be empty')
    assert.ok(grammar.length > 0, id + ': grammar study expansion must not be empty')
    grammarHighlighted++
    for (const hit of highlights) {
      assert.ok(Number.isInteger(hit.start) && Number.isInteger(hit.end), id + ': highlight offsets must be integers')
      assert.ok(hit.start >= 0 && hit.end > hit.start && hit.end <= sentence.length, id + ': highlight offsets must be in range')
      assert.equal(sentence.slice(hit.start, hit.end), hit.term, id + ': highlight must match the exact sentence substring')
      assert.ok(!['句中重点表达', '句子结构观察点', '句尾活用／表达观察点'].includes(hit.meaning), id + ': generic placeholder meaning is not acceptable')
      assert.ok(!/未识别到明确/.test(hit.explanation), id + ': generic fallback grammar explanation is not acceptable')
      const expansions = hit.type === 'vocabulary' ? vocabulary : grammar
      assert.ok(expansions.some(item => item.term === hit.term), id + ': every highlighted item must have a matching expansion')
    }
    const ordered = [...highlights].sort((a, b) => a.start - b.start || b.end - a.end)
    for (let index = 1; index < ordered.length; index++) {
      assert.ok(ordered[index - 1].end <= ordered[index].start, id + ': highlights must not overlap')
    }
  }
  assert.equal(grammarHighlighted, rows.length, 'every card must contain a directly highlighted grammar/structure point')
})


test('contextual bilingual annotation rules avoid isolated Japanese particles and polite endings', async () => {
  const generator = await readFile(new URL('./generate_language_sentence_seed.py', import.meta.url), 'utf8')
  assert.match(generator, /誰の\[\^、。！？!?/)
  assert.match(generator, /ですか：礼貌疑问句/)
  assert.match(generator, /疑问词问句/)
  assert.match(generator, /be 动词一般疑问句/)
  assert.match(generator, /rule_id/)
  assert.match(generator, /confidence/)
  assert.match(generator, /0084_refresh_contextual_bilingual_annotations/)
  assert.match(generator, /term in \{"です", "ます", "でした", "ました", "ください"\}/)
})
