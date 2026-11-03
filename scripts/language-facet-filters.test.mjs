import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import ts from 'typescript'

const app = await readFile(new URL('../src/App.vue', import.meta.url), 'utf8')
const css = await readFile(new URL('../src/style.css', import.meta.url), 'utf8')
const start = app.indexOf('type SentenceLengthFilter =')
const middle = app.indexOf('const languageReviewByCardId =')
const funcs = app.indexOf('function matchesLanguageMastery(')
const end = app.indexOf('const languagePage = ref(1)')
assert.ok(start > 0 && middle > start && funcs > middle && end > funcs)
const code = app.slice(start, middle) + '\n' + app.slice(funcs, end)
assert.doesNotMatch(code, /fetch\(|\/api\/|\.prepare\(/, 'facet calculations must not query D1')
const javascript = ts.transpile(code, { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None })
const build = new Function('ref', 'computed', 'languageCards', 'selectedLanguageCategory',
  'selectedLanguageMastery', 'masteredLanguageIds', 'languageReviewByCardId',
  'reviewDueByCardId', 'isLanguageCardUnlearned',
  javascript + '\nreturn { selectedSentenceLength, languageLengthCounts, languageCategoryCounts, languageMasteryCounts, visibleLanguageCards, resetLanguageFilters, languageFilterIsDefault }'
)
const computed = fn => ({ get value() { return fn() } })
const ref = value => ({value})

function setup() {
  const cards = [
    {id:'short',language:'ja',category:'日常句子',term:'あ'.repeat(9)},
    {id:'daily',language:'ja',category:'日常句子',term:'あ'.repeat(22)},
    {id:'work1',language:'ja',category:'职场语言',term:'あ'.repeat(30)},
    {id:'work2',language:'ja',category:'职场语言',term:'あ'.repeat(32)},
    {id:'work3',language:'ja',category:'职场语言',term:'あ'.repeat(19)},
  ]
  const mastered = new Set(['daily','work3'])
  const review = new Map([['work1',{review_count:2}]])
  const lengths = build(ref, computed, ref(cards), ref('全部'), ref('all'),
    ref(mastered), ref(review), ref(new Map([['work1',true]])),
    card => !mastered.has(card.id) && !(review.get(card.id)?.review_count > 0))
  // Expose mutable controls in the same closure using getters by injecting 
  // them through a second captured harness below for full combination checks.
  return lengths
}

test('faceted counts use the other two filters and avoid raw 5022 totals', () => {
  const controls = {category:ref('全部'), mastery:ref('all')}
  const mastered = new Set(['daily','work3'])
  const review = new Map([['work1',{review_count:2}]])
  const cards = [
    {id:'short',language:'ja',category:'日常句子',term:'あ'.repeat(9)},
    {id:'daily',language:'ja',category:'日常句子',term:'あ'.repeat(22)},
    {id:'work1',language:'ja',category:'职场语言',term:'あ'.repeat(30)},
    {id:'work2',language:'ja',category:'职场语言',term:'あ'.repeat(32)},
    {id:'work3',language:'ja',category:'职场语言',term:'あ'.repeat(19)},
  ]
  const ui = build(ref,computed,ref(cards),controls.category,controls.mastery,
    ref(mastered),ref(review),ref(new Map([['work1',true]])),
    card=>!mastered.has(card.id) && !(review.get(card.id)?.review_count>0))
  assert.equal(ui.selectedSentenceLength.value,'practice')
  assert.equal(ui.visibleLanguageCards.value.length,4)
  assert.deepEqual(ui.languageLengthCounts.value,{all:5,practice:4,challenge:2})
  assert.deepEqual(ui.languageCategoryCounts.value,{'全部':4,'日常句子':1,'职场语言':3})
  assert.deepEqual(ui.languageMasteryCounts.value,{all:4,unlearned:1,unmastered:1,mastered:2})
  controls.category.value='职场语言'
  assert.equal(ui.visibleLanguageCards.value.length,3)
  assert.deepEqual(ui.languageMasteryCounts.value,{all:3,unlearned:1,unmastered:1,mastered:1})
  controls.mastery.value='unlearned'
  assert.equal(ui.visibleLanguageCards.value.length,1)
  assert.deepEqual(ui.languageLengthCounts.value,{all:1,practice:1,challenge:1})
  assert.deepEqual(ui.languageCategoryCounts.value,{'全部':1,'日常句子':0,'职场语言':1})
  ui.selectedSentenceLength.value='challenge'
  assert.equal(ui.visibleLanguageCards.value.length,1)
  controls.category.value='全部'
  controls.mastery.value='all'
  ui.selectedSentenceLength.value='all'
  assert.equal(ui.visibleLanguageCards.value.length,5)
  assert.deepEqual(ui.languageMasteryCounts.value,{all:5,unlearned:2,unmastered:1,mastered:2})
})

test('selected facet counts always equal the visible cards across every combination', () => {
  const cards = [
    {id:'daily-long',language:'ja',category:'日常句子',term:'あ'.repeat(30)},
    {id:'daily-short',language:'ja',category:'日常句子',term:'あ'.repeat(8)},
    {id:'work-long',language:'ja',category:'职场语言',term:'あ'.repeat(40)},
    {id:'work-mid',language:'ja',category:'职场语言',term:'あ'.repeat(21)},
    {id:'work-mastered',language:'ja',category:'职场语言',term:'あ'.repeat(28)},
  ]
  const cat = ref('全部'), mastery = ref('all')
  const completed = new Set(['daily-long','work-mastered'])
  const started = new Map([['work-mid',{review_count:1}]])
  const ui = build(ref,computed,ref(cards),cat,mastery,ref(completed),ref(started),
    ref(new Map()),card=>!completed.has(card.id)&&!(started.get(card.id)?.review_count>0))
  for (const length of ['all','practice','challenge']) for(const category of ['全部','日常句子','职场语言'])
    for(const status of ['all','unlearned','unmastered','mastered']){
      ui.selectedSentenceLength.value=length
      cat.value=category
      mastery.value=status
      const expected=ui.visibleLanguageCards.value.length
      assert.equal(ui.languageLengthCounts.value[length],expected,length+':'+category+':'+status)
      assert.equal(ui.languageCategoryCounts.value[category],expected,length+':'+category+':'+status)
      assert.equal(ui.languageMasteryCounts.value[status],expected,length+':'+category+':'+status)
    }
  ui.resetLanguageFilters()
  assert.equal(ui.selectedSentenceLength.value,'practice')
  assert.equal(cat.value,'全部')
  assert.equal(mastery.value,'all')
  assert.equal(ui.languageFilterIsDefault.value,true)
})

test('mobile filter controls fit screen without horizontal clipped status buttons', () => {
  assert.match(app,/class="language-filter-panel"/)
  assert.match(app,/languageLengthCounts\[option\.id\]/)
  assert.match(app,/languageCategoryCounts\[category\.title\]/)
  assert.match(app,/languageMasteryCounts\[option\.id\]/)
  assert.match(app,/:aria-pressed="selectedLanguageMastery === option\.id"/)
  assert.match(css,/\.language-filter-options\.language-filter-status\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)\}/)
  assert.match(css,/\.language-filter-options\{display:grid|\.language-filter-options\s*\{\s*display:grid/)
  assert.doesNotMatch(app,/全部卡片 \{\{ languageCards\.length \}\}/)
})
