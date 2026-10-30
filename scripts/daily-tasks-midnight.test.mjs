import { test } from 'node:test'
import assert from 'node:assert/strict'
import { tokyoDate, mergeDailyTaskStates } from '../src/daily-tasks.ts'

test('Tokyo date changes at midnight in Japan, regardless of device timezone', () => {
  assert.equal(tokyoDate(new Date('2026-10-28T14:59:59Z')), '2026-10-28')
  assert.equal(tokyoDate(new Date('2026-10-28T15:00:00Z')), '2026-10-29')
  assert.equal(tokyoDate(new Date('2026-12-31T15:00:00Z')), '2027-01-01')
})
test('a newer local click wins over a delayed cloud response without masking untouched tasks', () => {
  const current = [{id:'a', done:true}, {id:'b', done:false}]
  const response = [{task_id:'a', completed:0}, {task_id:'b', completed:1}]
  const result = mergeDailyTaskStates(current, response, id => id !== 'a')
  assert.deepEqual(result, [{id:'a', done:true}, {id:'b', done:true}])
  assert.deepEqual(current, [{id:'a', done:true}, {id:'b', done:false}])
})
test('missing cloud data does not erase local entries', () => {
  assert.deepEqual(mergeDailyTaskStates([{id:'a', done:true}], [], () => true), [{id:'a', done:true}])
})
