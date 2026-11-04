import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import ts from 'typescript'

const source = await readFile(new URL('../src/daily-dialogue-listening.ts',import.meta.url),'utf8')
const component = await readFile(new URL('../src/DailyListeningPractice.vue',import.meta.url),'utf8')
const app = await readFile(new URL('../src/App.vue',import.meta.url),'utf8')
const styles = await readFile(new URL('../src/style.css',import.meta.url),'utf8')
const js = ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText
const data = await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'))

test('24 original listening scenes cover both categories in both languages',()=>{
  assert.deepEqual(data.listeningInventory(),{jaDaily:6,jaWork:6,enDaily:6,enWork:6})
  for(const language of ['ja','en']) {
    const ids = new Set()
    for(let day=1;day<=6;day++){
      const date='2026-11-0'+day
      const today=data.dailyListeningScenes(date,language)
      assert.deepEqual(today.map(s=>s.category),['日常句子','职场语言'])
      assert.ok(today.every(s=>s.language===language))
      assert.deepEqual(data.dailyListeningScenes(date,language),today)
      for(const scenario of today) {
        ids.add(scenario.id)
        assert.equal(scenario.turns.length,2)
        assert.ok(scenario.turns.every(turn=>turn.text&&turn.zh))
        assert.equal(scenario.options.length,4)
        assert.equal(new Set(scenario.options).size,4)
        assert.ok(Number.isInteger(scenario.correct)&&scenario.correct>=0&&scenario.correct<4)
        assert.ok(scenario.questionZh&&scenario.whyZh&&scenario.whyJa&&scenario.focusZh)
      }
    }
    assert.equal(ids.size,12,'six days must cover all scenes for '+language)
  }
})
test('comprehension first: transcript hidden until learner reveals or answers',()=>{
  assert.match(component,/v-if="revealed\[scene\.id\] \|\| isAnswered\(scene\.id\)"/)
  assert.match(component,/v-if="isAnswered\(scene\.id\)" class="daily-listening-feedback"/)
  assert.match(component,/:disabled="isAnswered\(scene\.id\)"/)
  assert.match(component,/localStorage\.setItem\(storageKey\.value/)
  assert.match(component,/scene\.whyZh/)
  assert.match(component,/scene\.whyJa/)
  assert.match(component,/scene\.turns\.map\(turn => turn\.text\)/)
  assert.match(component,/emit\('speak'/)
  assert.match(component,/emit\('pause'\)/)
  assert.match(component,/emit\('stop'\)/)
})
test('language UI provides device TTS status and proper touch targets without new Worker reads',()=>{
  assert.match(app,/import DailyListeningPractice from '\.\/DailyListeningPractice\.vue'/)
  assert.match(app,/<DailyListeningPractice :language="studyLanguage" :study-date="todayKey"/)
  assert.match(app,/:audio-status="speechStatus"/)
  assert.match(app,/@pause="toggleSpeechPause" @stop="stopSpeech"/)
  assert.match(styles,/\.daily-listening-options button\{[^}]*min-height:44px/)
  assert.doesNotMatch(source,/fetch\(|\.prepare\(|AI\.run\(/)
  assert.doesNotMatch(component,/\/api\/dictionary|AI\.run\(/)
  assert.match(component,/\/api\/listening-progress/)
  assert.match(component,/pendingListeningAnswers/)
  assert.match(component,/loadListeningOffline/)
})
