import test from 'node:test'
import assert from 'node:assert/strict'
import { inspectFePublishedBank } from './audit_fe_published_bank.mjs'

test('FE official-publication inventory detects precisely which 2023-2026 A/B items remain missing', () => {
  const corpus = inspectFePublishedBank()
  assert.equal(corpus.availableTotal, 104)
  assert.equal(corpus.officialCount, 66)
  assert.equal(corpus.missingCount, 38)
  const actual = corpus.years.map(y => ({
    year: y.year,
    A: y.sections.A.present.length,
    B: y.sections.B.present.length,
  }))
  assert.deepEqual(actual, [
    {year: 2023, A: 8, B: 1},
    {year: 2024, A: 8, B: 1},
    {year: 2025, A: 19, B: 4},
    {year: 2026, A: 19, B: 6},
  ])
  for (const y of corpus.years) {
    for (const sec of ['A', 'B']) {
      const total = y.sections[sec].present.length + y.sections[sec].missing.length
      assert.equal(total, sec === 'A' ? 20 : 6)
      assert.equal(new Set(y.sections[sec].present).size, y.sections[sec].present.length)
    }
  }
})
