import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const app = await readFile(new URL('../src/App.vue', import.meta.url), 'utf8')
const css = await readFile(new URL('../src/style.css', import.meta.url), 'utf8')

test('reselecting an exam does not reset scroll-sensitive content or restart FE installation', () => {
  assert.match(app, /function selectExam\(track: ExamTrack\)\s*\{\s*\/\/[^\n]*\n\s*if \(selectedTrackId\.value === track\.id\) return/)
  assert.match(app, /if \(feBankLoading\.value \|\| feBankPrepared\.value\) return/)
  assert.match(app, /feBankPrepared\.value = true/)
  assert.match(app, /await loadExamTracks\(true\)/)
  assert.match(app, /if \(!silent\) tracksLoading\.value = false/)
  assert.match(app, /class="fe-bank-inline-status" :class="\{ 'fe-bank-inline-status-idle': !feBankLoading \}"/)
  assert.match(css, /\.fe-bank-inline-status-idle\{visibility:hidden\}/)
  assert.doesNotMatch(app, /<p v-if="selectedTrackId === 'exam-fe' && feBankLoading" class="dictionary-status"/)
})

test('saved vocabulary cards give definitions full width and put all actions in one footer', () => {
  for (const name of ['saved-vocabulary-header','saved-vocabulary-definitions','saved-vocabulary-definition','saved-vocabulary-footer','vocabulary-inline-notice']) {
    assert.ok(app.includes('class="' + name + '"'), name)
    assert.match(css, new RegExp('\\.' + name + '\\{'))
  }
  assert.match(css, /\.saved-vocabulary-row\{[^}]*flex-direction:column/)
  assert.match(css, /\.saved-vocabulary-definition\{[^}]*minmax\(0,1fr\)/)
  assert.match(css, /\.saved-vocabulary-list\{[^}]*background:none/)
  assert.match(css, /\.saved-vocabulary-pronunciations\{[^}]*max-width:none/)
  assert.doesNotMatch(css, /linear-gradient\(90deg,#e9d9b3/)
})

test('existing pronunciation, sync and remove actions remain wired in saved vocabulary', () => {
  for (const action of ['speakDictionaryEnglish(entry)', 'speakDictionaryJapanese(entry)', 'speakDictionaryChinese(entry)', 'restoreVocabulary(entry.term)', 'toggleSaved(entry.term)', 'toggleSpeechPause', 'stopSpeech']) {
    assert.ok(app.includes(action), action)
  }
  assert.match(app, /vocabularyPending\.has\(entry\.term\)/)
  assert.match(app, /:disabled="vocabularyHydrating \|\| !vocabularySyncReady"/)
  assert.match(app, /<span class="saved-vocabulary-lang" lang="en">EN<\/span>/)
  assert.match(app, /<span class="saved-vocabulary-lang" lang="ja">日<\/span>/)
  assert.match(app, /<span class="saved-vocabulary-lang" lang="zh">中<\/span>/)
})
