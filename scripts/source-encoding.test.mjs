import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('bilingual Python source is valid UTF-8 and has explicit encoding declaration', async () => {
  const file = await readFile(new URL('./generate_language_sentence_seed.py', import.meta.url))
  const code = new TextDecoder('utf-8', { fatal: true }).decode(file)
  assert.match(code, /^#!\/usr\/bin\/env python3\n# -\*- coding: utf-8 -\*-/)
  assert.match(code, /EN_VOCAB\s*=/)
})

test('local preflight checks encoding before invoking data generator', async () => {
  const script = await readFile(new URL('./check-local.sh', import.meta.url), 'utf8')
  assert.ok(script.indexOf("source.read_text(encoding=\"utf-8\")") < script.indexOf('python3 scripts/generate_language_sentence_seed.py'))
  assert.match(script, /python3 -m py_compile/)
})
