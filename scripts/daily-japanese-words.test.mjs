import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import ts from 'typescript'
const [source,app]=await Promise.all([
  '../src/daily-language-scenes.ts','../src/App.vue',
].map(p=>readFile(new URL(p,import.meta.url),'utf8')))
const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText
const { dailyJapaneseWordCandidates }=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'))

test('five daily source-backed Japanese word slots rotate deterministically',()=>{
  const today=dailyJapaneseWordCandidates('2026-11-03')
  assert.ok(today.length>=40)
  assert.equal(new Set(today).size,today.length)
  assert.deepEqual(dailyJapaneseWordCandidates('2026-11-03'),today)
  assert.notDeepEqual(dailyJapaneseWordCandidates('2026-11-04'),today)
})
test('Japanese vocabulary is never invented by Workers AI or additional D1 lookup',()=>{
  const start=app.indexOf('async function loadDailyJapaneseWords')
  const syncStart=app.indexOf('type DailyWordCloudRow', start)
  const slice=app.slice(start, syncStart>=0 ? syncStart : app.indexOf('// Reuse existing licensed sentence cards'))
  assert.match(slice,/findStaticLearnerEntry\(term, 'ja'\)/)
  assert.match(slice,/\.slice\(0, 5\)/)
  assert.match(slice,/loadJapanesePitchDataset/)
  assert.doesNotMatch(slice,/fetch\(|\.prepare\(|AI\.run\(/)
  assert.match(app,/aria-label="每日实用日语词汇"/)
  assert.match(app,/v-for="word in dailyJapaneseWords"/)
  assert.match(app,/matchingJapaneseAccents\(dictionaryPitchData, word\.term, word\.reading\)/)
  assert.match(app,/pitchLabel\(n, word\.reading \|\| ''\)/)
  assert.match(app,/toggleDailyEnglishWord\(word\)/)
  assert.match(app,/speak\(word\.term, 'ja-JP'/)
})
