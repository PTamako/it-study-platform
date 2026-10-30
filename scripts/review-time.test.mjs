import test from 'node:test'
import assert from 'node:assert/strict'
import { utcReviewMillis } from '../src/review-time.ts'

test('D1 UTC date remains UTC on Japanese devices', () => {
  assert.equal(utcReviewMillis('2026-10-31 08:00:00'), Date.parse('2026-10-31T08:00:00Z'))
  assert.equal(utcReviewMillis('2026-10-31T17:00:00+09:00'), Date.parse('2026-10-31T08:00:00Z'))
})
test('empty and invalid review timestamps never become immediately due', () => {
  assert.equal(utcReviewMillis(''), Infinity)
  assert.equal(utcReviewMillis('not a date'), Infinity)
})
