import test from 'node:test'
import assert from 'node:assert/strict'
import ts from 'typescript'
import { readFile } from 'node:fs/promises'

let source = await readFile(new URL('../worker/index.ts', import.meta.url), 'utf8')
source = source.replace("import { checkWriteRateLimit, handleAuthRequest, requireAuth } from './auth'",
  "const checkWriteRateLimit=async()=>null; const handleAuthRequest=async()=>null; const requireAuth=async()=>null;")
source = source.replace("import { feSeeds, seedUrl } from './fe-question-bank'",
  "const feSeeds=[]; const seedUrl=()=>'';")
const worker = (await import('data:text/javascript;base64,' + Buffer.from(ts.transpile(source, {
  target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext,
})).toString('base64'))).default

test('authenticated dictionary lookup prioritizes official DeepL translations when server secret exists', async () => {
  const original = globalThis.fetch
  const calls = []
  globalThis.fetch = async (input, init) => {
    const url = String(input)
    calls.push({ url, init })
    if (url.includes('api-free.deepl.com/v2/translate')) {
      const payload = JSON.parse(init.body)
      const text = payload.target_lang === 'JA' ? '今日は大雨です' : 'It is raining heavily today'
      return new Response(JSON.stringify({ translations: [{ text }] }), { status: 200 })
    }
    throw new Error('Unexpected external request: ' + url)
  }
  try {
    const response = await worker.fetch(new Request('https://study.test/api/dictionary?q=' + encodeURIComponent('今天下大雨') + '&lang=zh'),
      { DEEPL_API_KEY: 'example-secret:fx' })
    assert.equal(response.status, 200)
    const data = await response.json()
    assert.equal(data.items[0].translationJa, '今日は大雨です')
    assert.equal(data.items[0].englishTerm, 'It is raining heavily today')
    assert.equal(calls.length, 2)
    for (const call of calls) {
      assert.equal(call.init.method, 'POST')
      assert.equal(call.init.headers.authorization, 'DeepL-Auth-Key example-secret:fx')
      assert.deepEqual(JSON.parse(call.init.body).text, ['今天下大雨'])
    }
    assert.ok(!JSON.stringify(data).includes('example-secret'))
  } finally { globalThis.fetch = original }
})

test('official DeepL error falls back to free providers without exposing the secret', async () => {
  const original = globalThis.fetch
  const called = []
  globalThis.fetch = async (input) => {
    const url = String(input)
    called.push(url)
    if (url.includes('deepl.com')) return new Response(JSON.stringify({ message: 'Quota exceeded' }), { status: 456 })
    if (url.includes('mymemory.translated.net')) return new Response(JSON.stringify({
      responseData: { translatedText: 'replacement translation' }, responseStatus: 200,
    }), { status: 200 })
    if (url.includes('translate_a/single')) return new Response('[]', { status: 200 })
    throw new Error(url)
  }
  try {
    const response = await worker.fetch(new Request('https://study.test/api/dictionary?q=未收录的短句&lang=zh'),
      { DEEPL_API_KEY: 'example-secret:fx' })
    const data = await response.json()
    assert.equal(response.status, 200)
    assert.equal(data.items[0].translationJa, 'replacement translation')
    assert.equal(data.items[0].englishTerm, 'replacement translation')
    assert.equal(called.filter(url => url.includes('deepl.com')).length, 2)
    assert.ok(called.some(url => url.includes('mymemory.translated.net')))
    assert.ok(!JSON.stringify(data).includes('example-secret'))
  } finally { globalThis.fetch = original }
})

test('official provider is never used when no API secret is configured, and public GET checks session', async () => {
  const original = globalThis.fetch
  globalThis.fetch = async (input) => {
    const url = String(input)
    assert.ok(!url.includes('deepl.com'))
    if (url.includes('mymemory.translated.net'))
      return new Response(JSON.stringify({ responseData: { translatedText: 'online value' }, responseStatus: 200 }))
    return new Response('[]')
  }
  try {
    const response = await worker.fetch(new Request('https://study.test/api/dictionary?q=一个新词&lang=zh'), {})
    assert.equal(response.status, 200)
    assert.equal((await response.json()).items.length, 1)
    assert.match(source, /authorizedForOfficial = env\.DEEPL_API_KEY \? !\(await requireAuth\(request, env\)\) : false/)
  } finally { globalThis.fetch = original }
})
