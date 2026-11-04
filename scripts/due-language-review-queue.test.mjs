import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
const app=await readFile(new URL('../src/App.vue',import.meta.url),'utf8')
const css=await readFile(new URL('../src/style.css',import.meta.url),'utf8')

test('due-only selection never includes unseen cards or future-scheduled cards',()=>{
  assert.match(app,/const languagePracticeMode = ref<'all' \| 'due'>\('all'\)/)
  const due=app.slice(app.indexOf('const dueLanguageCards ='),app.indexOf('const languagePracticeCard ='))
  assert.match(due,/review\?\.review_count/)
  assert.match(due,/reviewDueByCardId\.value\.get\(card\.id\)/)
  assert.match(due,/languagePracticeMode\.value === 'due' \? dueLanguageCards\.value : visibleLanguageCards\.value/)
  assert.doesNotMatch(due,/fetch\(|\/api\//)
  const reviews=[
    {id:'due',review:{review_count:2},due:true},
    {id:'later',review:{review_count:1},due:false},
    {id:'unseen',review:undefined,due:true},
    {id:'new',review:{review_count:0},due:true},
  ]
  const selected=reviews.filter(c=>Boolean(c.review?.review_count&&c.due)).map(c=>c.id)
  assert.deepEqual(selected,['due'])
})
test('review clock refreshes after iOS Safari returns from suspended background',()=>{
  const begin = app.indexOf('function onDailyVisibilityChange()')
  const end = app.indexOf('const examRecords =', begin)
  const resume = app.slice(begin,end)
  assert.match(resume,/document\.visibilityState === 'visible'/)
  assert.match(resume,/reviewClockNow\.value = Date\.now\(\)/)
  assert.doesNotMatch(resume,/fetch\(|\/api\//)
})
test('review queue only changes mode, not saved history or D1 data',()=>{
  assert.match(app,/languagePracticeDeck\.value\[languagePracticeIndex\.value % languagePracticeDeck\.value\.length\]/)
  assert.match(app,/languagePracticeIndex\.value = \(languagePracticeIndex\.value \+ 1\) % languagePracticeDeck\.value\.length/)
  assert.match(app,/:aria-pressed="languagePracticeMode === 'due'"/)
  assert.match(app,/只复习到期/)
  assert.match(app,/当前没有到期复习的卡片/)
  assert.match(css,/\.language-review-mode button\{[^}]*min-height:44px/)
  const area=app.slice(app.indexOf('const languagePracticeMode ='),app.indexOf('function languageExpansions'))
  assert.doesNotMatch(area,/\/api\/|fetch\(/)
})
