import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const app = readFileSync(new URL('../src/App.vue', import.meta.url), 'utf8')

test('iOS speech requests playback audio and primes the HTML media path synchronously', () => {
  const speechStart = app.indexOf("function speak(text:")
  const playbackRequest = app.indexOf("setSpeechAudioSessionType('playback')", speechStart)
  const mediaPrime = app.indexOf('primeMediaAudioSession()', playbackRequest)
  const synthesisStart = app.indexOf('synthesis.speak(utterance)', mediaPrime)

  assert.notEqual(speechStart, -1, 'shared speech entry point exists')
  assert.notEqual(playbackRequest, -1, 'speech requests playback audio session')
  assert.notEqual(mediaPrime, -1, 'speech primes HTML media playback')
  assert.notEqual(synthesisStart, -1, 'speech synthesis still runs after the best-effort media prime')
  assert.ok(playbackRequest < mediaPrime && mediaPrime < synthesisStart, 'audio setup runs before speech synthesis')
})

test('silent media priming is short, silent, and cleans up its temporary audio element', () => {
  assert.match(app, /const dataBytes = Math\.floor\(sampleRate \* 0\.18\) \* 2/)
  assert.match(app, /writeText\(0, 'RIFF'\)/)
  assert.match(app, /audio\.addEventListener\('ended', cleanup, \{ once: true \}\)/)
  assert.match(app, /audio\.addEventListener\('error', cleanup, \{ once: true \}\)/)
  assert.match(app, /URL\.revokeObjectURL\(objectUrl\)/)
  assert.match(app, /The primary SpeechSynthesis path must still run if media priming is blocked/)
})
