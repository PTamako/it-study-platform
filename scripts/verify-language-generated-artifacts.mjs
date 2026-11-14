#!/usr/bin/env node
// A generated-output cache is an optimization, never a substitute for the
// complete tests, local D1 migration validation, or artifact integrity checks.
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

for (const name of [
  '0081_language_sentence_cards.sql',
  '0082_refresh_language_sentence_annotations.sql',
  '0084_refresh_contextual_bilingual_annotations.sql',
  '0087_rebuild_contextual_bilingual_sentence_cards.sql',
  '0115_refresh_precise_bilingual_annotations.sql',
]) {
  const path = join('migrations', name)
  assert.ok(statSync(path).size > 4096, 'Missing or truncated language migration: ' + path)
}

for (const [folder, count] of [['language-cards', 5000], ['learner-lexicon', 3000]]) {
  const manifest = JSON.parse(readFileSync(join('public', folder, 'manifest.json'), 'utf8'))
  assert.equal(manifest.version, 1, 'Unexpected ' + folder + ' manifest version')
  for (const lang of ['ja', 'en']) {
    const route = manifest[lang]
    assert.equal(typeof route, 'string', 'Missing asset route for ' + lang)
    assert.match(route, new RegExp('^/' + folder + '/' + lang + '\\.[a-f0-9]{16}\\.json$'))
    const path = join('public', route.slice(1))
    const raw = readFileSync(path, 'utf8')
    assert.ok(raw.endsWith('\n'), 'Missing final newline: ' + path)
    const checksum = createHash('sha256').update(raw.slice(0, -1)).digest('hex').slice(0, 16)
    assert.equal(route, '/' + folder + '/' + lang + '.' + checksum + '.json',
      'Asset filename fingerprint does not match content: ' + path)
    const data = JSON.parse(raw)
    assert.ok(Array.isArray(data.items), 'Invalid items payload: ' + path)
    if (folder === 'language-cards') {
      assert.equal(data.items.length, count, 'Sentence count mismatch: ' + path)
    } else {
      assert.ok(data.items.length >= count, 'Truncated learner dictionary: ' + path)
    }
  }
}
console.log('Generated language SQL and four content-addressed public datasets verified.')
