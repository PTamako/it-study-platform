import test from 'node:test'
import assert from 'node:assert/strict'
import { inspectFePublishedBank, publishedQuestionIds } from './audit_fe_published_bank.mjs'

test('FE official-publication inventory detects precisely which 2023-2026 A/B items remain missing', () => {
  const corpus = inspectFePublishedBank()
  assert.equal(corpus.availableTotal, 104)
  assert.equal(corpus.officialCount, 104)
  assert.equal(corpus.missingCount, 0)
  const actual = corpus.years.map(y => ({
    year: y.year,
    A: y.sections.A.present.length,
    B: y.sections.B.present.length,
  }))
  assert.deepEqual(actual, [
    {year: 2023, A: 20, B: 6},
    {year: 2024, A: 20, B: 6},
    {year: 2025, A: 20, B: 6},
    {year: 2026, A: 20, B: 6},
  ])
  for (const y of corpus.years) {
    for (const sec of ['A', 'B']) {
      const total = y.sections[sec].present.length + y.sections[sec].missing.length
      assert.equal(total, sec === 'A' ? 20 : 6)
      assert.equal(new Set(y.sections[sec].present).size, y.sections[sec].present.length)
    }
  }
})


test('only a question row counts as an official original, not an occurrence reference', () => {
  const sql = `INSERT INTO questions VALUES
('fe-ipa-official-2024-a-11','exam-fe');
INSERT INTO fe_exemption_occurrences VALUES
('2021-06-13',47,'2021','fe-ipa-official-2024-a-11','c');`
  const entries = [...publishedQuestionIds(sql)]
  assert.equal(entries.length,1)
  assert.deepEqual(entries[0].slice(1),['2024','a','11'])
})
