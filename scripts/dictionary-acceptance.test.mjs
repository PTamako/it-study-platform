import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const app = await readFile(new URL('../src/App.vue', import.meta.url), 'utf8')
const worker = await readFile(new URL('../worker/index.ts', import.meta.url), 'utf8')

test('English dictionary results always expose a separate Japanese-aid player', () => {
  assert.match(app, /title="播放英语原音；缺少对应词时会提示"/)
  assert.match(app, /title="播放日语辅助读音；缺少假名时会提示"/)
  assert.match(app, /title: '英日发音与 IT 术语'/)
  assert.match(app, /function speakDictionaryEnglish\(entry: DictionaryEntry\)/)
  assert.match(app, /function speakDictionaryJapanese\(entry: DictionaryEntry\)/)
})

test('recent English vocabulary also exposes its Japanese-aid player', () => {
  assert.match(app, /aria-label="播放日语辅助读音"/)
  assert.match(app, /aria-label="播放英语发音"/)
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


test('exam prep and practical training use Japanese-only speech targets and show independent controls', () => {
  assert.match(app, /speakJapaneseQuestion\(\x60\$\{question\.prompt\}。選択肢：\$\{options\}\x60, \x60exam:\$\{question\.id\}\x60\)/)
  assert.match(app, /speakJapaneseQuestion\(\x60\$\{scenario\.title\}。状況：\$\{scenario\.situation\}。課題：\$\{scenario\.task\}。選択肢：\$\{options\}\x60, \x60practical:\$\{scenario\.id\}\x60\)/)
  assert.match(app, /speechStatusTarget === 'exam:' \+ currentQuestion\.id/)
  assert.match(app, /speechStatusTarget === 'practical:' \+ currentScenario\.id/)
  assert.match(app, /@click="toggleSpeechPause"/)
  assert.match(app, /@click="stopSpeech">停止/)
})

test('speech requests media playback audio session when the browser supports it', () => {
  assert.match(app, /type BrowserAudioSession = \{ type: string \}/)
  assert.match(app, /setSpeechAudioSessionType\('playback'\)/)
  assert.match(app, /setSpeechAudioSessionType\('auto'\)/)
  assert.match(app, /audioSession\?: BrowserAudioSession/)
})

test('speech never uses the operating system default voice before language voices load', () => {
  assert.match(app, /if \(availableVoices\.length === 0\) \{[\s\S]*?系统语音列表尚未加载，暂未播放/)
  assert.match(app, /synthesis\.addEventListener\('voiceschanged'/)
  assert.match(app, /系统语音已就绪，请再次点击播放/)
  assert.match(app, /availableVoices\.length > 0 && voices\.length === 0/)
  assert.match(app, /exactLanguageVoices\.find\(candidate => candidate\.localService/)
  assert.match(app, /播放请求已结束/)
  assert.match(app, /着信音与通知音量及静音状态/)
  assert.match(app, /此状态不代表已确认听到声音/)
  assert.match(app, /语音：浏览器自动选择/)
})

test('speech stops when leaving a module or switching exam/practical content', () => {
  assert.match(app, /function navigate\(id: ModuleId\) \{\s*stopSpeech\(\)/)
  assert.match(app, /function selectExam\(track: ExamTrack\) \{\s*stopSpeech\(\)/)
  assert.match(app, /function nextPracticeQuestion\(\) \{\s*stopSpeech\(\)/)
  assert.match(app, /function nextScenario\(\) \{\s*stopSpeech\(\)/)
})


test('language learning cards and active-recall cards have original/example playback and speech controls', () => {
  assert.match(app, /function speakLanguageCard\(card: LanguageCard \| null, example = false, practice = false\)/)
  assert.match(app, /speak\(text \|\| '', lang, \x60\$\{practice \? 'language-practice' : 'language-card'\}:\$\{card\.id\}:\$\{example \? 'example' : 'term'\}\x60\)/)
  assert.match(app, /speechStatusTarget\.startsWith\('language-practice:' \+ languagePracticeCard\.id/)
  assert.match(app, /speechStatusTarget\.startsWith\('language-card:' \+ card\.id/)
  assert.match(app, /播放原文/)
  assert.match(app, /播放例句/)
  assert.match(app, /继续播放/)
  assert.match(app, /@click="stopSpeech">停止/)
  assert.match(app, /function nextLanguagePractice\(\) \{\s*stopSpeech\(\)/)
})

test('every dictionary result and saved word exposes both English and Japanese playback controls', () => {
  const start = app.indexOf('<div class="dictionary-list">')
  const end = app.indexOf('saved-vocabulary-block', start)
  const dictionaryResults = app.slice(start, end)
  assert.ok(start >= 0 && end > start, 'dictionary result template should be found')
  assert.ok(dictionaryResults.includes('@click="speakDictionaryEnglish(entry)"'))
  assert.ok(dictionaryResults.includes('@click="speakDictionaryJapanese(entry)"'))
  assert.equal(dictionaryResults.includes('v-if="entry.englishTerm || entry.language === \'en\'"'), false)
  assert.equal(dictionaryResults.includes('v-else-if="entry.reading || entry.language === \'ja\'"'), false)
  assert.match(dictionaryResults, /缺少对应词时会提示/)
  assert.match(dictionaryResults, /缺少假名时会提示/)
})

test('speech UI schedules its diagnostic tone only after iOS AudioContext is running', () => {
  assert.match(app, /function testAudioOutput\(\)/)
  assert.match(app, /window\.AudioContext/)
  assert.match(app, /webkitAudioContext\?: typeof AudioContext/)
  assert.match(app, /new AudioContextConstructor\(\)/)
  assert.match(app, /const resumePromise = context\.resume\(\)/)
  assert.match(app, /if \(context\.state !== 'running'\)/)
  assert.match(app, /Schedule the tone only AFTER the context is running/)
  assert.match(app, /oscillator\.frequency\.setValueAtTime\(880, now\)/)
  assert.match(app, /oscillator\.start\(now \+ 0\.03\)/)
  assert.match(app, /@click="testAudioOutput">测试设备声音/)
  assert.match(app, /此结果仍不能证明语音合成正常/)
})

test('preview demo mode supplies isolated Japanese and English sample sentences without loading cloud language data', () => {
  assert.match(app, /new URLSearchParams\(window\.location\.search\)\.get\('demo'\) === '1'/)
  assert.match(app, /const previewLanguageFixtures: LanguageCard\[\] = \[/)
  assert.match(app, /id: 'demo-ja-daily-001'/)
  assert.match(app, /id: 'demo-ja-work-001'/)
  assert.match(app, /id: 'demo-en-daily-001'/)
  assert.match(app, /id: 'demo-en-work-001'/)
  assert.match(app, /if \(previewDemoMode\) \{\s*languageCards\.value = previewLanguageFixtures\.filter\(card => card\.language === studyLanguage\.value\)/)
  assert.match(app, /预览演示模式：使用内置示例句子，不读取或写入云端学习数据/)
})


test('daily task writes are serialized per task and use a snapshot of each toggle', () => {
  assert.match(app, /const dailyTaskSaveQueues = new Map<string, Promise<void>>\(\)/)
  assert.match(app, /const completed = task\.done/)
  assert.match(app, /const previous = dailyTaskSaveQueues\.get\(taskId\) \|\| Promise\.resolve\(\)/)
  assert.match(app, /previous\.catch\(\(\) => undefined\)\.then\(async \(\) =>/)
  assert.match(app, /completed\s*\}\),/)
  assert.match(app, /dailyTaskSaveRequestIds\.get\(taskId\) === requestId/)
})
