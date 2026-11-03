import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import ts from 'typescript'

const source = await readFile(new URL('../src/daily-grammar-lessons.ts', import.meta.url), 'utf8')
const component = await readFile(new URL('../src/DailyGrammarLesson.vue', import.meta.url), 'utf8')
const app = await readFile(new URL('../src/App.vue', import.meta.url), 'utf8')
const css = await readFile(new URL('../src/style.css', import.meta.url), 'utf8')
const js = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText
const curriculum = await import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'))

test('original static JLPT/TOEIC grammar inventory contains 24 bilingual topics and 48 questions', () => {
  assert.deepEqual(curriculum.grammarLessonInventory(), {ja:12,en:12,questions:48})
  for (const lang of ['ja','en']) {
    const topics = []
    for (let i=0;i<12;i++) {
      const date = new Date(Date.UTC(2026, 10, i+1)).toISOString().slice(0,10)
      const item = curriculum.dailyGrammarLesson(date,lang)
      topics.push(item.id)
      for (const field of ['point','zh','ja','form','example','translation','tipZh','tipJa'])
        assert.ok(item[field]?.trim(), date+':'+lang+':'+field)
      assert.equal(item.questions.length,2)
      for(const question of item.questions) {
        assert.equal(question.options.length,4)
        assert.equal(new Set(question.options).size,4,'unique options '+item.id)
        assert.ok(Number.isInteger(question.correct) && question.correct >=0 && question.correct < 4)
        assert.ok(question.options[question.correct].trim())
        assert.ok(question.prompt.trim() && question.whyZh.trim() && question.whyJa.trim())
      }
    }
    assert.equal(new Set(topics).size,12,lang+' covers all topics before repeating')
  }
})

test('daily selection is stable and yesterday review really points to yesterday', () => {
  for (const language of ['ja','en']) {
    const today = curriculum.dailyGrammarLesson('2026-11-03',language)
    assert.deepEqual(today,curriculum.dailyGrammarLesson('2026-11-03',language))
    assert.equal(curriculum.previousGrammarLesson('2026-11-03',language).id,
      curriculum.dailyGrammarLesson('2026-11-02',language).id)
    assert.notEqual(curriculum.dailyGrammarLesson('2026-11-04',language).id,today.id)
    assert.equal(curriculum.dailyGrammarLesson('invalid',language).id,curriculum.dailyGrammarLesson('1970-01-01',language).id)
  }
})

test('language page contains the offline course and reuses existing browser TTS', () => {
  assert.match(app,/import DailyGrammarLesson from '\.\/DailyGrammarLesson\.vue'/)
  assert.match(app,/<DailyGrammarLesson :language="studyLanguage" :study-date="todayKey"/)
  assert.match(app,/@speak="\(text, language\) => speak\(text, language, 'daily-grammar:' \+ studyLanguage\)"/)
  assert.match(component,/dailyGrammarLesson\(props\.studyDate, props\.language\)/)
  assert.match(component,/previousGrammarLesson\(props\.studyDate, props\.language\)/)
  assert.match(component,/localStorage\.setItem\(storageKey\.value/)
  assert.match(component,/:disabled="isAnswered\(question\.id\)"/)
  assert.match(component,/questions\.value\.filter/)
  assert.match(css,/\.daily-grammar-options button\{[^}]*min-height:44px/)
  assert.doesNotMatch(source+component,/fetch\(|\.prepare\(|\/api\/language|\.run\(|AI\.run\(/)
})

test('grammar feedback is bilingual and shows correct answer only after choosing', () => {
  assert.match(component,/v-if="isAnswered\(question\.id\)" class="daily-grammar-feedback"/)
  assert.match(component,/question\.whyZh/)
  assert.match(component,/question\.whyJa/)
  assert.match(component,/String\.fromCharCode\(65 \+ question\.correct\)/)
  assert.match(component,/question\.options\.slice|v-for="\(option, optionIndex\) in question\.options"/)
})
