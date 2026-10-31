import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { evaluateScratchExpression as evaluate, formatScratchResult } from '../src/scratch-calculator.ts'

test('safe calculator handles arithmetic, operator precedence, parentheses and percentage', () => {
  assert.equal(evaluate('2+3×4'), 14)
  assert.equal(evaluate('(2+3)×4'), 20)
  assert.equal(evaluate('−6÷2'), -3)
  assert.equal(evaluate('12.5 + .25'), 12.75)
  assert.equal(evaluate('200×10%'), 20)
  assert.equal(evaluate('0-4'), -4)
  assert.equal(evaluate('2/-4'), -.5)
  assert.equal(formatScratchResult(evaluate('0.1+0.2')), '0.3')
  assert.equal(evaluate('-0'), 0)
})
test('calculator rejects malformed, huge or unsafe expressions', () => {
  for (const input of ['', '(', '(1+2', '1+2)', '1++', 'Math.random()', '1/0',
    'window.location', '9'.repeat(120), '2**3', 'Infinity', '1e999']) {
    assert.throws(() => evaluate(input), input)
  }
})
test('all answer surfaces embed inline scratch tools without covering questions', async () => {
  const app = await readFile(new URL('../src/App.vue', import.meta.url), 'utf8')
  const tool = await readFile(new URL('../src/ExamScratchTools.vue', import.meta.url), 'utf8')
  const css = await readFile(new URL('../src/style.css', import.meta.url), 'utf8')
  assert.match(app, /<ExamScratchTools :key="'practice-' \+ currentQuestion\.id"/)
  assert.match(app, /<ExamScratchTools :key="'mock-' \+ question\.id"/)
  assert.match(app, /<ExamScratchTools :key="'practical-' \+ currentScenario\.id"/)
  assert.match(tool, /v-if="calculatorOpen"/)
  assert.match(tool, /v-if="boardOpen"/)
  assert.match(tool, /@pointerdown="pointerDown"/)
  assert.match(tool, /@pointermove="pointerMove"/)
  assert.match(tool, /@pointercancel="pointerEnd"/)
  assert.match(tool, /@lostpointercapture="pointerEnd"/)
  assert.match(tool, /setPointerCapture/)
  assert.match(tool, /getCoalescedEvents/)
  assert.match(tool, /ResizeObserver/)
  assert.match(tool, /toBlob/)
  assert.match(css, /@media\(max-width:699px\)\{\.exam-scratch-tools\{display:none!important\}\}/)
  assert.match(css, /\.scratch-drawing-canvas\{[\s\S]*?touch-action:none/)
  const block = css.slice(css.indexOf('\/\* Large-screen exam calculator'))
  assert.doesNotMatch(block, /position:(?:fixed|absolute|sticky)/)
})
