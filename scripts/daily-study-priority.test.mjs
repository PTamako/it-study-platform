import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import ts from 'typescript'

const source = await readFile(new URL('../src/daily-language-scenes.ts', import.meta.url), 'utf8')
const app = await readFile(new URL('../src/App.vue', import.meta.url), 'utf8')
const js = ts.transpileModule(source, { compilerOptions: {
  module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022,
} }).outputText
const {
  selectDailyScenes, dailyBusinessWordCandidates, dailyJapaneseWordCandidates,
  prioritizeDailyWords, gradeDailyWord, dailyWordPriority,
} = await import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'))

const sentence = '今天需要确认任务，沟通重要事项，并及时跟进相关工作的进度。'
const cards = [
  { id: 'new', language: 'ja', category: '日常句子', term: sentence },
  { id: 'due', language: 'ja', category: '日常句子', term: sentence },
  { id: 'future', language: 'ja', category: '日常句子', term: sentence },
  { id: 'mastered', language: 'ja', category: '日常句子', term: sentence },
  { id: 'work', language: 'ja', category: '职场语言', term: sentence },
]
const progress = new Map([
  ['due', { reviewCount: 2, due: true, mastered: false }],
  ['future', { reviewCount: 2, due: false, mastered: false }],
  ['mastered', { reviewCount: 5, due: false, mastered: true }],
])

test('unlearned sentences are preferred over due, future, and mastered cards', () => {
  const result = selectDailyScenes(cards, '2026-11-05', 'ja', { progress })
  assert.equal(result[0].card.id, 'new')
  assert.equal(result[1].card.id, 'work')
  assert.deepEqual(result, selectDailyScenes(cards, '2026-11-05', 'ja', { progress }))
  assert.deepEqual(cards.map(c => c.id), ['new', 'due', 'future', 'mastered', 'work'])
})

test('due cards are preferred after unseen are exhausted; pinned card never swaps mid-day', () => {
  const masteredNew = new Map(progress)
  masteredNew.set('new', { reviewCount: 1, due: false, mastered: true })
  assert.equal(selectDailyScenes(cards, '2026-11-05', 'ja', { progress: masteredNew })[0].card.id, 'due')
  const pinned = selectDailyScenes(cards, '2026-11-05', 'ja', {
    progress: masteredNew, pinned: { '日常句子': 'new' },
  })
  assert.equal(pinned[0].card.id, 'new')
  assert.equal(selectDailyScenes(cards, '2026-11-05', 'ja', {
    progress, pinned: { '日常句子': 'missing' },
  })[0].card.id, 'new')
})

test('daily word rotation reaches new terms without random repeated five-word blocks', () => {
  for (const getTerms of [dailyBusinessWordCandidates, dailyJapaneseWordCandidates]) {
    const total = getTerms('2026-11-01').length
    const seen = new Set()
    for (let n = 0; n < Math.floor(total / 5); n++) {
      const date = new Date(Date.UTC(2026, 10, n + 1)).toISOString().slice(0, 10)
      const firstFive = getTerms(date).slice(0, 5)
      assert.equal(firstFive.length, 5)
      for (const term of firstFive) {
        assert.equal(seen.has(term), false, term + ' repeated before cycle')
        seen.add(term)
      }
    }
  }
})

test('unlearned words come first, due reviews next, future-scheduled words last', () => {
  const date = '2026-11-05'
  const terms = ['saved-not-mastered', 'due', 'new', 'future']
  const progress = {
    'en:due': { streak: 2, nextDate: date, lastDate: '2026-11-01' },
    'en:future': { streak: 3, nextDate: '2026-11-12', lastDate: '2026-11-03' },
  }
  assert.deepEqual(prioritizeDailyWords(terms, date, 'en', progress),
    ['saved-not-mastered', 'new', 'due', 'future'])
  assert.equal(dailyWordPriority(undefined, date), 0)
  assert.equal(dailyWordPriority(progress['en:due'], date), 1)
  assert.equal(dailyWordPriority(progress['en:future'], date), 2)
})

test('word recall intervals follow 1/3/7/14/30 days and cannot be double-graded', () => {
  let row
  for (const [date, expected] of [
    ['2026-11-05', '2026-11-06'],
    ['2026-11-06', '2026-11-09'],
    ['2026-11-09', '2026-11-16'],
    ['2026-11-16', '2026-11-30'],
    ['2026-11-30', '2026-12-30'],
  ]) {
    row = gradeDailyWord(row, date, true)
    assert.equal(row.nextDate, expected)
    assert.equal(gradeDailyWord(row, date, false), row)
  }
  const forgotten = gradeDailyWord(row, '2026-12-30', false)
  assert.equal(forgotten.streak, 0)
  assert.equal(forgotten.nextDate, '2026-12-31')
})

test('daily progress uses current review/cache and preserves existing grammar, bookmarks and D1', () => {
  assert.match(app, /dailyScenesReady\.value = true/)
  assert.match(app, /pinned: \{/)
  assert.match(app, /dailySceneProgress\.value/)
  assert.match(app, /prioritizeDailyWords\(rotated, date, language, dailyWordProgress\.value\)/)
  assert.match(app, /localStorage\.setItem\('zhixue:daily-word-review-v1'/)
  assert.match(app, /toggleDailyEnglishWord\(word\)/)
  assert.match(app, /<DailyGrammarLesson :language="studyLanguage"/)
  const localWordSection = app.slice(app.indexOf('const dailyWordProgress ='), app.indexOf('const dailyEnglishWords ='))
  assert.doesNotMatch(localWordSection, /fetch\(|\.prepare\(|AI\.run\(/)
})
