import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const app = await readFile(new URL('../src/App.vue', import.meta.url), 'utf8')
const worker = await readFile(new URL('../worker/index.ts', import.meta.url), 'utf8')

test('English dictionary results always expose a separate Japanese-aid player', () => {
  assert.match(app, /title="播放英语发音"/)
  assert.match(app, /title="播放日语辅助读音"/)
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

test('speech plays on the first tap while language voices are still loading', () => {
  assert.match(app, /window\.speechSynthesis\.getVoices\(\)/)
  assert.match(app, /synthesis\.addEventListener\('voiceschanged'/)
  assert.match(app, /utterance\.lang = lang/)
  assert.match(app, /If Safari still has no voice list on the first tap[\s\S]*?keep the utterance's explicit/)
  assert.doesNotMatch(app, /if \(availableVoices\.length === 0\) \{[\s\S]*?return/)
  assert.match(app, /availableVoices\.length > 0 && voices\.length === 0/)
  assert.match(app, /exactLanguageVoices\.find\(candidate => candidate\.localService/)
  assert.match(app, /播放完成。/)
  assert.doesNotMatch(app, /着信音与通知音量及静音状态/)
  assert.doesNotMatch(app, /此状态不代表已确认听到声音/)
  assert.doesNotMatch(app, /语音：浏览器自动选择/)
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
  assert.match(dictionaryResults, /aria-label="'播放英语发音：/)
  assert.match(dictionaryResults, /aria-label="'播放日语辅助读音：/)
})

test('production speech UI contains no device-audio diagnostic controls', () => {
  assert.doesNotMatch(app, /testAudioOutput|试听设备声音|AudioContext=running|此结果仍不能证明语音合成正常/)
})

test('production UI does not expose preview demo mode or seeded sample sentences', () => {
  assert.doesNotMatch(app, /previewDemoMode|previewLanguageFixtures|demo-ja-daily-001|预览演示模式/)
})


test('saved dictionary changes update local state only after the cloud confirms the write', () => {
  const start = app.indexOf('async function toggleSaved(term: string)')
  const end = app.indexOf('async function lookupDictionary()', start)
  const handler = app.slice(start, end)
  assert.ok(start >= 0 && end > start, 'saved-word handler should be found')
  assert.match(app, /const savedWordRequests = new Set<string>()/)
  assert.match(handler, /if \(savedWordRequests\.has\(term\)\) return/)
  assert.match(handler, /const response = await fetch\('\/api\/vocabulary\/saved'/)
  assert.match(handler, /if \(!response\.ok\) throw new Error/)
  assert.match(handler, /本地收藏状态未更改/)
  assert.match(handler, /savedWordRequests\.delete\(term\)/)
})

test('dictionary terms without a saved entry snapshot show a concise actionable message', () => {
  const start = app.indexOf('async function toggleSaved(term: string)')
  const end = app.indexOf('async function lookupDictionary()', start)
  const handler = app.slice(start, end)
  assert.match(handler, /if \(!entry\) \{[\s\S]*?请先查询到完整词条，再收藏以同步到生词本。[\s\S]*?return/)
})

test('saved dictionary removal does not discard local state before the cloud confirms deletion', () => {
  const start = app.indexOf('async function toggleSaved(term: string)')
  const end = app.indexOf('async function lookupDictionary()', start)
  const handler = app.slice(start, end)
  const removeStart = handler.indexOf('action: \'remove\'')
  const removeEnd = handler.indexOf('return', removeStart)
  const removeHandler = handler.slice(0, removeEnd)
  assert.ok(removeStart >= 0 && removeEnd > removeStart, 'remove handler should be found')
  assert.ok(removeHandler.indexOf('if (!response.ok) throw new Error') < removeHandler.indexOf('savedWords.value = savedWords.value.filter'))
})


test('saved vocabulary sync failures preserve local state and report actionable errors', () => {
  const start = app.indexOf('async function toggleSaved(term: string)')
  const end = app.indexOf('async function lookupDictionary()', start)
  const handler = app.slice(start, end)
  assert.match(handler, /本地收藏状态未更改/)
  assert.match(handler, /savedWordRequests\.delete\(term\)/)
})


test('practical submission snapshots the scenario and ignores stale responses after switching', () => {
  const start = app.indexOf('let scenarioSubmissionId = 0')
  const end = app.indexOf('watch([selectedTrackId', start)
  const handlers = app.slice(start, end)
  assert.ok(start >= 0 && end > start, 'practical submission handlers should be found')
  assert.match(handlers, /const submittedScenario = currentScenario\.value/)
  assert.match(handlers, /const submittedOption = selectedScenarioOption\.value/)
  assert.match(handlers, /scenarioSubmissionId \+= 1/)
  assert.match(handlers, /requestId !== scenarioSubmissionId \|\| currentScenario\.value\?\.id !== submittedScenario\.id/)
  assert.match(handlers, /translateScenarioExplanation\(submittedScenario\.id, feedback\)/)
  assert.match(handlers, /if \(requestId === scenarioSubmissionId\) scenarioSubmitting\.value = false/)
})


test('practical scenario list ignores late responses from an earlier track request', () => {
  const start = app.indexOf('let scenarioLoadRequestId = 0')
  const end = app.indexOf('function nextScenario()', start)
  const loader = app.slice(start, end)
  assert.ok(start >= 0 && end > start, 'scenario loader should be found')
  assert.match(loader, /const requestId = \+\+scenarioLoadRequestId/)
  assert.match(loader, /const trackId = selectedTrack\.value\?\.id/)
  assert.match(loader, /if \(requestId !== scenarioLoadRequestId\) return/)
  assert.match(loader, /if \(requestId === scenarioLoadRequestId\) scenariosLoading\.value = false/)
})

test('exam question loads are invalidated when switching track, source, or review mode', () => {
  assert.match(app, /let practiceLoadRequestId = 0/)
  assert.match(app, /const requestId = \+\+practiceLoadRequestId/)
  assert.match(app, /if \(requestId !== practiceLoadRequestId\) return/)
  assert.match(app, /practiceLoadRequestId \+= 1/)
  assert.match(app, /if \(requestId === practiceLoadRequestId\) quizLoading\.value = false/)
})

test('question progress requests use a captured track and ignore stale responses', () => {
  assert.match(app, /let questionProgressRequestId = 0/)
  assert.match(app, /async function loadQuestionProgress\(trackId = selectedTrack\.value\?\.id \|\| ''\)/)
  assert.match(app, /if \(!response\.ok \|\| requestId !== questionProgressRequestId\) return/)
  assert.match(app, /if \(requestId !== questionProgressRequestId\) return/)
})


test('practice answer submission snapshots the selected question and answer', () => {
  assert.match(app, /const answer = selectedOption\.value/)
  assert.match(app, /question_id: question\.id,[\s\S]*?answer,/)
  assert.match(app, /if \(data\.progress\) questionProgressById\.value\[question\.id\] = data\.progress/)
  assert.match(app, /if \(requestId === practiceAnswerRequestId\) \{\s*quizError\.value/)
  assert.match(app, /function nextPracticeQuestion\(\) \{\s*stopSpeech\(\)\s*practiceAnswerRequestId \+= 1/)
})

test('daily task writes are serialized per task and use a snapshot of each toggle', () => {
  assert.match(app, /const dailyTaskSaveQueues = new Map<string, Promise<void>>\(\)/)
  assert.match(app, /const completed = task\.done/)
  assert.match(app, /const previous = dailyTaskSaveQueues\.get\(taskId\) \|\| Promise\.resolve\(\)/)
  assert.match(app, /previous\.catch\(\(\) => undefined\)\.then\(async \(\) =>/)
  assert.match(app, /completed\s*\}\),/)
  assert.match(app, /dailyTaskSaveRequestIds\.get\(taskId\) === requestId/)
})


test('Japanese lookup does not show a failed fallback beside a successful Jisho definition', () => {
  assert.match(worker, /const jishoItems = jishoEntries\(jishoRows, ''\)/)
  assert.match(worker, /Prefer real dictionary entries over a second generic card/)
  assert.match(worker, /暂未获得英语释义（在线词典未返回结果）/)
  assert.doesNotMatch(worker, /translationJa: query/)
})

test('Japanese dictionary results show a real Japanese explanation when available', () => {
  assert.match(worker, /commonJapaneseExplanations/)
  assert.match(worker, /'ふさがる': '穴や通路がふさがって通れなくなること/)
  assert.match(worker, /if \(!japaneseAid && firstDefinition\)/)
  assert.match(worker, /translationJa: index === 0 \? japaneseAid : ''/)
})


test('dictionary guides users to switch language when selected Japanese/English conflicts with clear input script', () => {
  assert.ok(app.includes('const containsJapaneseKana = /[\\u3040-\\u30ff]/.test(q)'))
  assert.ok(app.includes("requestedLanguage === 'en' && containsJapaneseKana"))
  assert.ok(app.includes('检测到日语输入，请切换到「日语」后再查询'))
  assert.ok(app.includes("requestedLanguage === 'ja' && looksEnglishOnly"))
  assert.ok(app.includes('检测到英语输入，请切换到「英语」后再查询'))
})
