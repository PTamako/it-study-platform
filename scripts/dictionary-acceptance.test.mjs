import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const app = await readFile(new URL('../src/App.vue', import.meta.url), 'utf8')
const worker = await readFile(new URL('../worker/index.ts', import.meta.url), 'utf8')

test('English dictionary results always expose a separate Japanese-aid player', () => {
  assert.match(app, /entry\.reading \|\| entry\.language === 'ja' \|\| entry\.language === 'en' \|\| entry\.englishTerm/)
  assert.match(app, /播放日语辅助读音/)
  assert.match(app, /title="播放日语辅助读音（片假名为近似提示）"/)
})

test('recent English vocabulary also exposes its Japanese-aid player', () => {
  assert.match(app, /aria-label="播放日语辅助读音"/)
  assert.match(app, /title="播放日语辅助读音（片假名为近似提示）"/)
})

test('speech voice selection never falls back to an arbitrary first voice', () => {
  assert.doesNotMatch(app, /\|\|\s*voices\[0\]/)
  assert.match(app, /availableVoices\.length > 0 && voices\.length === 0/)
  assert.match(app, /未检测到日语语音/)
  assert.match(app, /未检测到英语语音/)
})

test('Japanese playback does not pretend an unknown English term has a verified kana guide', () => {
  assert.match(app, /const text = entry\.reading \|\| \(entry\.language === 'ja' \? entry\.term : ''\)/)
  assert.match(app, /该词暂未收录日语假名读音/)
})

test('IT dictionary remains local-only and does not fall back to online translation', () => {
  assert.match(worker, /if \(requestedLanguage === 'it'\) return \[\]/)
  assert.match(worker, /lang 参数只支持 auto、ja、en、it/)
})

const glossaryMigration = await readFile(new URL('../migrations/0077_expand_it_glossary_security_network_management.sql', import.meta.url), 'utf8')

test('dictionary ignores stale requests and offers retry after errors', () => {
  assert.match(app, /let dictionaryRequestId = 0/)
  assert.match(app, /if \(requestId !== dictionaryRequestId\) return/)
  assert.match(app, /AbortSignal\.timeout\(8000\)/)
  assert.match(app, /@click="lookupDictionary">重试/)
})

test('dictionary speech can be paused, resumed, and stopped', () => {
  assert.match(app, /function toggleSpeechPause\(\)/)
  assert.match(app, /function stopSpeech\(\)/)
  assert.match(app, /@click="toggleSpeechPause"/)
  assert.match(app, /@click="stopSpeech">停止/)
})

test('offline glossary includes SG-relevant identity, security, networking, database, and management terms', () => {
  for (const term of ['TOTP', 'RBAC', 'TLS', 'WAF', 'SIEM', 'CSRF', 'SSRF', 'DNS', 'REST', 'ACID', 'RTO', 'RPO', 'PDCA', 'SDLC', 'ゼロトラスト']) {
    assert.ok(glossaryMigration.includes(term), `missing glossary term: ${term}`)
  }
  assert.match(glossaryMigration, /meaning_ja, meaning_en, example, source_module, mastery, aliases/)
  assert.match(worker, /rawQuery\.normalize\('NFKC'\)/)
})

test('English alias results never reuse a Japanese headword reading as English katakana', () => {
  assert.match(worker, /const reading = isEnglishQuery \? kanaGuide : \(storedReading \|\| kanaGuide\)/)
  for (const term of ['totp', 'rbac', 'siem', 'csrf', 'dns', 'pdca']) {
    assert.match(worker, new RegExp(term + ":"))
  }
})

test('changing dictionary language invalidates previous results and pending requests', () => {
  assert.match(app, /function setDictionaryLanguage\(language: 'auto' \| 'ja' \| 'en' \| 'it'\)/)
  assert.match(app, /dictionaryRequestId \+= 1/)
  assert.match(app, /@click="setDictionaryLanguage\('it'\)"/)
})
