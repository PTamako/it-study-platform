import test from 'node:test'
import assert from 'node:assert/strict'
import ts from 'typescript'
import { readFile } from 'node:fs/promises'

const app = await readFile(new URL('../src/App.vue', import.meta.url), 'utf8')
const css = await readFile(new URL('../src/style.css', import.meta.url), 'utf8')
let source = await readFile(new URL('../worker/index.ts', import.meta.url), 'utf8')
source = source.replace("import { checkWriteRateLimit, handleAuthRequest, requireAuth } from './auth'",
  "const checkWriteRateLimit=async()=>null; const handleAuthRequest=async()=>null; const requireAuth=async()=>null;")
source = source.replace("import { feSeeds, seedUrl } from './fe-question-bank'",
  "const feSeeds=[]; const seedUrl=()=>'';")
const worker = (await import('data:text/javascript;base64,' + Buffer.from(ts.transpile(source, {
  target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext,
})).toString('base64'))).default

const dictionaryRows = [{
  word: 'book',
  phonetic: '/bʊk/',
  meanings: [
    { partOfSpeech: 'noun', definitions: [
      { definition: 'A set of printed pages.' },
      { definition: 'A written work.', example: 'I bought a book.' },
    ] },
    { partOfSpeech: 'verb', definitions: [
      { definition: 'To reserve a seat or a room.', example: 'Book a table.' },
    ] },
  ],
}]
const japaneseRows = [{
  slug: '走る',
  japanese: [{ word: '走る', reading: 'はしる' }],
  senses: [
    { parts_of_speech: ['Godan verb with ru ending'], english_definitions: ['to run', 'to move quickly'] },
    { parts_of_speech: ['Noun'], english_definitions: ['running'] },
  ],
}]

function fakeResponse(url) {
  if (url.includes('api.dictionaryapi.dev/api/v2/entries/en/book')) {
    return new Response(JSON.stringify(dictionaryRows))
  }
  if (url.includes('jisho.org/api/')) {
    return new Response(JSON.stringify({ data: japaneseRows }))
  }
  if (url.includes('mymemory.translated.net')) {
    return new Response(JSON.stringify({
      responseStatus: 200,
      responseData: { translatedText: '翻译结果' },
    }))
  }
  if (url.includes('translate_a/single')) return new Response('[]')
  throw new Error('unexpected lookup: ' + url)
}
async function lookup(term, lang) {
  const original = globalThis.fetch
  globalThis.fetch = async input => fakeResponse(String(input))
  try {
    const r = await worker.fetch(
      new Request('https://study.test/api/dictionary?q=' + encodeURIComponent(term) + '&lang=' + lang), {},
    )
    return { status: r.status, body: await r.json() }
  } finally {
    globalThis.fetch = original
  }
}

test('English dictionary preserves multiple attested parts of speech and numbered senses', async () => {
  const { status, body } = await lookup('book', 'en')
  assert.equal(status, 200)
  const entry = body.items.find(item => item.source === 'Free Dictionary')
  assert.ok(entry)
  assert.equal(entry.tag, '英日词典')
  assert.equal(entry.phonetic, '/bʊk/')
  assert.deepEqual(entry.senses.map(sense => sense.partOfSpeech), ['noun', 'verb'])
  assert.equal(entry.senses[0].definitions.length, 2)
  assert.equal(entry.senses[1].definitions[0], 'To reserve a seat or a room.')
  assert.match(entry.senses[1].example, /Book a table/)
  assert.ok(!JSON.stringify(entry).includes('GAS_TRANSLATOR_TOKEN'))
})

test('Jisho supplies Japanese parts of speech without treating machine translation as POS', async () => {
  const { status, body } = await lookup('走る', 'ja')
  assert.equal(status, 200)
  const entry = body.items.find(item => item.source === 'Jisho')
  assert.ok(entry)
  assert.equal(entry.tag, '日英词典')
  assert.deepEqual(entry.senses.map(sense => sense.partOfSpeech),
    ['Godan verb with ru ending', 'Noun'])
  assert.equal(entry.senses[0].definitions[0], 'to run')
})

test('mobile, iPad portrait, iPad landscape, and desktop layouts remain readable and touch-friendly', () => {
  assert.match(app, /lexicon-entry-with-senses/)
  assert.match(app, /class="lexicon-header"/)
  assert.match(app, /class="lexicon-parts"/)
  assert.match(app, /class="lexicon-translations"/)
  assert.match(app, /class="lexicon-senses"/)
  assert.match(app, /class="lexicon-definitions"/)
  assert.match(app, /dictionaryPartOfSpeechLabel\(sense.partOfSpeech\)/)
  assert.match(app, /class="dict-actions"/)
  assert.match(css, /@media \(min-width:700px\) and \(max-width:1199px\)/)
  assert.match(css, /@media \(min-width:1100px\) and \(orientation:landscape\)/)
  assert.match(css, /@media \(max-width:699px\)/)
  assert.match(css, /min-height:48px;min-width:48px/)
  assert.match(css, /grid-template-areas:"head head"/)
})

test('headwords, audio and save controls remain functional and sentence translations are not assigned fabricated word classes', () => {
  assert.match(app, /@click="speakDictionaryEnglish\(entry\)"/)
  assert.match(app, /@click="speakDictionaryJapanese\(entry\)"/)
  assert.match(app, /@click="speakDictionaryChinese\(entry\)"/)
  assert.match(app, /@click="toggleSaved\(entry.term\)"/)
  assert.match(app, /@click="supplementDictionaryWithAi\(entry\)"/)
  assert.match(source, /Generic translation and AI output must never invent parts of speech/)
  assert.doesNotMatch(source, /tag: partOfSpeech \? '英日词典 · '/)
  assert.doesNotMatch(app, /检查翻译连接|quickDictionarySearch/)
})
