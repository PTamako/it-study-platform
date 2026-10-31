import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseMockSnapshot } from '../src/mock-recovery.ts'

const mk = (track = 'exam-sg', section = 'SG') => {
  const count = section === 'B' ? 20 : 60
  const minutes = track === 'exam-sg' ? 120 : section === 'A' ? 90 : 100
  const start = 1800000000000
  return {
    track, section, started_at: start, deadline: start + minutes * 60000,
    duration_minutes: minutes,
    questions: Array.from({ length: count }, (_, i) => ({
      id: track + '-' + i, track_id: track, prompt: 'Question ' + i,
      answer: 'a', options: [{ id: 'a', text: 'yes' }, { id: 'b', text: 'no' }],
    })),
    answers: { [track + '-0']: 'a' },
  }
}
test('SG and FE in-progress exams resume with the same questions and answers', () => {
  for (const [track, section] of [['exam-sg','SG'],['exam-fe','A'],['exam-fe','B']]) {
    const snapshot = mk(track, section)
    assert.deepEqual(parseMockSnapshot(JSON.parse(JSON.stringify(snapshot))), snapshot)
  }
})
test('corrupted, repeated, or conflicting mock data is never restored', () => {
  assert.equal(parseMockSnapshot(null), null)
  const duplicate = mk(); duplicate.questions[1].id = duplicate.questions[0].id
  assert.equal(parseMockSnapshot(duplicate), null)
  const badSection = mk('exam-fe','A'); badSection.section = 'B'
  assert.equal(parseMockSnapshot(badSection), null)
  const missing = mk(); missing.questions.pop()
  assert.equal(parseMockSnapshot(missing), null)
  const foreign = mk(); foreign.questions[0].track_id = 'exam-fe'
  assert.equal(parseMockSnapshot(foreign), null)
  const wrongId = mk(); wrongId.answers['missing'] = 'a'
  assert.equal(parseMockSnapshot(wrongId), null)
  const badDeadline = mk(); badDeadline.deadline -= 2000
  assert.equal(parseMockSnapshot(badDeadline), null)
})

test('mock snapshots remain resumable without answer keys before grading', () => {
  const before = mk()
  for (const question of before.questions) delete question.answer
  assert.deepEqual(parseMockSnapshot(before), before)
})
