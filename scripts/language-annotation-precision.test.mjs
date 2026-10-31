import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import ts from 'typescript'

const source = await readFile(new URL('../src/language-annotations.ts', import.meta.url), 'utf8')
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } })
const { getLanguageHighlights, getLanguageExpansions, getSentenceParts } =
  await import('data:text/javascript;base64,' + Buffer.from(compiled.outputText).toString('base64'))

function hit(sentence, term, type, meaning = 'old note', explanation = 'old explanation', occurrence = 0) {
  const start = sentence.indexOf(term, occurrence)
  assert.ok(start >= 0, 'Fixture missing ' + term)
  return { start, end: start + term.length, term, type, meaning, explanation }
}
function card(sentence, language, hits = [], expansion = []) {
  return { term: sentence, language, highlight_json: JSON.stringify(hits),
    vocabulary_expansion_json: JSON.stringify(expansion), grammar_expansion_json: JSON.stringify(expansion) }
}

test('Japanese: never turn いつ in そいつ into an unrelated question word, or から inside 分からない into a particle', () => {
  const sentence = 'そいつの使い方が分からないんだ。'
  const old = [
    hit(sentence, 'いつ', 'vocabulary', '什么时候', '询问时间'),
    hit(sentence, 'の', 'grammar', '名词修饰', '旧说明'),
    hit(sentence, 'が', 'grammar', '主语', '旧说明'),
    hit(sentence, 'から', 'grammar', '助词「が」：主语／关注对象', '这其实不是から'),
  ]
  const c = card(sentence, 'ja', old, [{ term: 'から', meaning: '助词「が」', explanation: '过时解析' }])
  const highlights = getLanguageHighlights(c)
  const terms = highlights.map(item => item.term)
  assert.ok(terms.includes('そいつ'), 'whole word should be highlighted')
  assert.ok(terms.includes('使い方'), 'actual word should be highlighted')
  assert.ok(terms.includes('分からない'), 'negative verb should be highlighted')
  assert.ok(terms.includes('の') && terms.includes('が') && terms.includes('んだ'), 'real grammar should be highlighted')
  assert.ok(!terms.includes('いつ') && !terms.includes('から'), 'subword and false grammar must be rejected')
  assert.deepEqual(getLanguageExpansions(c, 'grammar').map(item => item.term).sort(), ['が', 'の', 'んだ'].sort())
  assert.deepEqual(getLanguageExpansions(c, 'vocabulary').map(item => item.term).sort(), ['そいつ', '使い方', '分からない'].sort())
  assert.equal(getLanguageExpansions(c, 'grammar').find(item => item.term === 'が')?.meaning, '主语／描述对象')
  assert.equal(getSentenceParts(c).map(part => part.text).join(''), sentence)
})

test('Japanese: particle から is valid only when actually independent of a verb stem', () => {
  const sentence = '学校から家まで歩きます。'
  const c = card(sentence, 'ja', [hit(sentence, 'から', 'grammar'), hit(sentence, 'まで', 'grammar')])
  assert.ok(getLanguageHighlights(c).some(item => item.term === 'から'))
  assert.ok(getLanguageHighlights(c).some(item => item.term === 'まで'))
  assert.ok(!getLanguageHighlights(card('分からない。', 'ja', [hit('分からない。', 'から', 'grammar')]))
    .some(item => item.term === 'から'))
})

test('English: no internal substrings, and real phrase/grammar notes survive', () => {
  const sentence = 'Would you check the schedule?'
  const c = card(sentence, 'en', [
    hit(sentence, 'he', 'vocabulary'),
    hit(sentence, 'Would you', 'grammar', '礼貌请求', '委婉请求'),
    hit(sentence, 'schedule', 'vocabulary', '日程', '工作中的安排'),
  ], [{ term: 'he', meaning: '他', explanation: 'stale' }])
  const terms = getLanguageHighlights(c).map(item => item.term.toLowerCase())
  assert.ok(terms.includes('would you'))
  assert.ok(terms.includes('check') && terms.includes('schedule'))
  assert.ok(!terms.includes('he'))
  assert.ok(!getLanguageExpansions(c, 'vocabulary').some(item => item.term === 'he'))
  assert.equal(getSentenceParts(c).map(part => part.text).join(''), sentence)
})

test('Invalid offsets, detached expansions and duplicate spans never render', () => {
  const sentence = 'Could you confirm the schedule?'
  const c = card(sentence, 'en', [
    { start: 1000, end: 2000, term: 'confirm', type: 'vocabulary', meaning: '错误', explanation: '错误' },
    { start: 0, end: 5, term: 'Would', type: 'grammar', meaning: '错误', explanation: '错误' },
    hit(sentence, 'confirm', 'vocabulary'),
    hit(sentence, 'confirm', 'vocabulary'),
  ], [{ term: 'phantom', meaning: '幽灵', explanation: '不存在' }])
  assert.ok(!getLanguageExpansions(c, 'vocabulary').some(x => x.term === 'phantom'))
  assert.equal(getLanguageHighlights(c).filter(x => x.term === 'confirm').length, 1)
  const hits = getLanguageHighlights(c)
  assert.ok(hits.every(x => sentence.slice(x.start, x.end) === x.term))
  assert.ok(hits.every((x, i) => !hits.slice(i + 1).some(y => x.start < y.end && x.end > y.start)))
  assert.equal(getSentenceParts(c).map(x => x.text).join(''), sentence)
})

test('If no trustworthy annotation exists, do not invent an explanation', () => {
  const c = card('§§§', 'ja', [], [{ term: 'が', meaning: '主语', explanation: 'unrelated' }])
  assert.deepEqual(getLanguageHighlights(c), [])
  assert.deepEqual(getLanguageExpansions(c, 'grammar'), [])
  assert.deepEqual(getSentenceParts(c).map(x => x.text), ['§§§'])
})
