import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import ts from 'typescript'
const source = await readFile(new URL('../src/daily-language-scenes.ts', import.meta.url), 'utf8')
const js = ts.transpileModule(source, {compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText
const {selectDailyScenes, dailyBusinessWordCandidates} = await import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'))

const cards = [
  {id:'ja-d1',language:'ja',category:'日常句子',term:'今日は仕事が終わったら一緒にご飯を食べませんか。'},
  {id:'ja-d2',language:'ja',category:'日常句子',term:'駅で待っていてね。'},
  {id:'ja-w1',language:'ja',category:'职场语言',term:'問題を確認しましたので、対応方法をご相談させてください。'},
  {id:'ja-w2',language:'ja',category:'职场语言',term:'了解です。'},
  {id:'en-d1',language:'en',category:'日常句子',term:'Could you tell me how to get to the station from here?'},
  {id:'en-w1',language:'en',category:'职场语言',term:'Would you mind confirming the deadline for this project?'},
]
test('daily Japanese lesson always includes both daily and work situations without extra database records', () => {
  const rows=selectDailyScenes(cards,'2026-11-03','ja')
  assert.deepEqual(rows.map(row=>row.category),['日常句子','职场语言'])
  assert.deepEqual(rows.map(row=>row.card?.id),['ja-d1','ja-w1'])
  assert.deepEqual(selectDailyScenes(cards,'2026-11-03','ja'),rows)
})
test('daily English lesson uses existing cards and does not mix Japanese lessons', () => {
  const result=selectDailyScenes(cards,'2026-11-03','en')
  assert.deepEqual(result.map(row=>row.card?.language),['en','en'])
  assert.equal(result.length,2)
})
test('no fabricated filler card when a category is empty; stable order never mutates source', () => {
  const source=[cards[2],cards[0]]
  const copy=[...source]
  const result=selectDailyScenes(source,'2026-11-03','en')
  assert.equal(result[0].card,null)
  assert.equal(result[1].card,null)
  assert.deepEqual(source,copy)
})
test('UI reuses existing TTS, saved mastery and context parsing', async () => {
  const app=await readFile(new URL('../src/App.vue',import.meta.url),'utf8')
  assert.match(app,/selectDailyScenes\(languageCards\.value, todayKey\.value, studyLanguage\.value\)/)
  assert.match(app,/v-for="scene in dailyLanguageScenes"/)
  assert.match(app,/toggleLanguageCard\(scene\.card\.id\)/)
  assert.match(app,/speakLanguageCard\(scene\.card\)/)
  assert.match(app,/sentenceParts\(scene\.card\)/)
  assert.match(app,/languageExpansions\(scene\.card, 'grammar'\)/)
})

test('daily business headwords rotate reproducibly and never assert official TOEIC provenance', async () => {
  const today = dailyBusinessWordCandidates('2026-11-03')
  assert.ok(today.length >= 40)
  assert.equal(new Set(today).size, today.length)
  assert.deepEqual(today, dailyBusinessWordCandidates('2026-11-03'))
  assert.notDeepEqual(today, dailyBusinessWordCandidates('2026-11-04'))
  const app = await readFile(new URL('../src/App.vue', import.meta.url), 'utf8')
  assert.match(app, /dailyBusinessWordCandidates\(todayKey\.value\)/)
  assert.match(app, /findStaticLearnerEntry\(term, 'en'\)/)
  assert.match(app, /\.slice\(0, 5\)/)
  assert.match(app, /非官方 TOEIC 词表/)
  assert.match(app, /未验证为 IPA/)
  assert.match(app, /speak\(word\.term, 'en-US'/)
})
