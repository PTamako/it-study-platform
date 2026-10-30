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
  const preflight = script.indexOf('source.read_text(encoding="utf-8")')
  const generator = script.indexOf('scripts/generate_language_sentence_seed.py')
  assert.ok(preflight >= 0 && generator > preflight)
  assert.match(script, /-m py_compile/)
})

test('local script prefers Python 3.12 and supports existing macOS Python 3.8', async () => {
  const script = await readFile(new URL('./check-local.sh', import.meta.url), 'utf8')
  assert.ok(script.indexOf('python3.12') < script.indexOf('python3.11'))
  assert.ok(script.indexOf('python3.11') < script.indexOf('python3.10'))
  assert.match(script, /sys.version_info < \(3, 8\)/)
  assert.match(script, /PYTHON_BIN/)
})
