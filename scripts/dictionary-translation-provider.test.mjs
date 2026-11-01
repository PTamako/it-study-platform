import test from 'node:test'
import assert from 'node:assert/strict'
import ts from 'typescript'
import { readFile } from 'node:fs/promises'

let source = await readFile(new URL('../worker/index.ts', import.meta.url), 'utf8')
// Auth simulation deliberately rejects anonymous requests. Official Azure credentials
// may only be used for verified user sessions, even though GET /api/dictionary is public.
source = source.replace("import { checkWriteRateLimit, handleAuthRequest, requireAuth } from './auth'",
  "const checkWriteRateLimit=async()=>null; const handleAuthRequest=async()=>null; const requireAuth=async(request)=>request.headers.get('x-test-auth')==='yes'?null:new Response('unauthorized',{status:401});")
source = source.replace("import { feSeeds, seedUrl } from './fe-question-bank'",
  "const feSeeds=[]; const seedUrl=()=>'';")
const worker = (await import('data:text/javascript;base64,' + Buffer.from(ts.transpile(source, {
  target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext,
})).toString('base64'))).default
const url = term => 'https://study.test/api/dictionary?q=' + encodeURIComponent(term) + '&lang=zh'
const authorized = term => new Request(url(term), { headers: { 'x-test-auth': 'yes' } })

test('authenticated lookup prefers Azure Translator v3 with exact from/to languages', async () => {
  const original = globalThis.fetch
  const calls = []
  globalThis.fetch = async (input, init) => {
    const target = new URL(String(input))
    calls.push({ url: target, init })
    assert.equal(target.hostname, 'api.cognitive.microsofttranslator.com')
    assert.equal(target.pathname, '/translate')
    assert.equal(target.searchParams.get('api-version'), '3.0')
    assert.equal(target.searchParams.get('from'), 'zh-Hans')
    assert.equal(init.method, 'POST')
    assert.deepEqual(JSON.parse(init.body), [{ Text: '今天下大雨' }])
    assert.equal(init.headers['Ocp-Apim-Subscription-Key'], 'test-only-secret')
    assert.equal(init.headers['Ocp-Apim-Subscription-Region'], 'japaneast')
    const language = target.searchParams.get('to')
    assert.ok(['en', 'ja'].includes(language))
    const translated = language === 'ja' ? '今日は大雨です' : 'It is raining heavily today'
    return new Response(JSON.stringify([{ translations: [{ text: translated, to: language }] }]), { status: 200 })
  }
  try {
    const response = await worker.fetch(authorized('今天下大雨'), {
      AZURE_TRANSLATOR_KEY: 'test-only-secret', AZURE_TRANSLATOR_REGION: 'japaneast',
    })
    assert.equal(response.status, 200)
    const data = await response.json()
    assert.equal(data.items.length, 1)
    assert.equal(data.items[0].translationJa, '今日は大雨です')
    assert.equal(data.items[0].englishTerm, 'It is raining heavily today')
    assert.equal(calls.length, 2)
    assert.ok(!JSON.stringify(data).includes('test-only-secret'))
    assert.ok(!JSON.stringify(data).includes('japaneast'))
  } finally { globalThis.fetch = original }
})

test('global Translator resource does not send region header', async () => {
  const original = globalThis.fetch
  const calls = []
  globalThis.fetch = async (input, init) => {
    const target = new URL(String(input)).searchParams.get('to')
    calls.push(init)
    return new Response(JSON.stringify([{ translations: [
      { to: target, text: target === 'ja' ? '日本語訳' : 'English translation' },
    ] }]))
  }
  try {
    const response = await worker.fetch(authorized('尚未收录的词句'), { AZURE_TRANSLATOR_KEY: 'global-key' })
    assert.equal(response.status, 200)
    assert.equal((await response.json()).items.length, 1)
    assert.equal(calls.length, 2)
    assert.ok(calls.every(call => !('Ocp-Apim-Subscription-Region' in call.headers)))
  } finally { globalThis.fetch = original }
})

test('Azure outage or F0 quota exhaustion falls back to existing free providers', async () => {
  const original = globalThis.fetch
  const calls = []
  globalThis.fetch = async (input) => {
    const requestUrl = String(input)
    calls.push(requestUrl)
    if (requestUrl.includes('api.cognitive.microsofttranslator.com'))
      return new Response(JSON.stringify({ error: { message: 'Quota exceeded' } }), { status: 429 })
    if (requestUrl.includes('mymemory.translated.net'))
      return new Response(JSON.stringify({
        responseData: { translatedText: 'free fallback value' }, responseStatus: 200,
      }), { status: 200 })
    if (requestUrl.includes('translate_a/single')) return new Response('[]', { status: 200 })
    throw new Error(requestUrl)
  }
  try {
    const response = await worker.fetch(authorized('另一个没有收录的短句'), {
      AZURE_TRANSLATOR_KEY: 'test-only-secret',
    })
    const data = await response.json()
    assert.equal(response.status, 200)
    assert.equal(data.items[0].translationJa, 'free fallback value')
    assert.equal(data.items[0].englishTerm, 'free fallback value')
    assert.equal(calls.filter(entry => entry.includes('api.cognitive.microsofttranslator.com')).length, 2)
    assert.ok(calls.some(entry => entry.includes('mymemory.translated.net')))
    assert.ok(!JSON.stringify(data).includes('test-only-secret'))
  } finally { globalThis.fetch = original }
})

test('public/anonymous dictionary queries never spend an installed Azure key', async () => {
  const original = globalThis.fetch
  const calls = []
  globalThis.fetch = async (input) => {
    const requestUrl = String(input)
    calls.push(requestUrl)
    assert.ok(!requestUrl.includes('cognitive.microsofttranslator.com'))
    if (requestUrl.includes('mymemory.translated.net'))
      return new Response(JSON.stringify({
        responseData: { translatedText: 'public free text' }, responseStatus: 200,
      }))
    return new Response('[]', { status: 200 })
  }
  try {
    const response = await worker.fetch(new Request(url('另外一个词组')), {
      AZURE_TRANSLATOR_KEY: 'must-stay-private',
    })
    assert.equal(response.status, 200)
    assert.equal((await response.json()).items.length, 1)
    assert.ok(calls.length > 0)
    assert.match(source, /authorizedForAzure = env\.AZURE_TRANSLATOR_KEY/)
    assert.match(source, /await requireAuth\(request, env\)/)
  } finally { globalThis.fetch = original }
})

test('missing Azure secret preserves free providers without requiring account changes', async () => {
  const original = globalThis.fetch
  const calls = []
  globalThis.fetch = async (input) => {
    const requestUrl = String(input)
    calls.push(requestUrl)
    assert.ok(!requestUrl.includes('cognitive.microsofttranslator.com'))
    if (requestUrl.includes('mymemory.translated.net'))
      return new Response(JSON.stringify({
        responseData: { translatedText: 'available free' }, responseStatus: 200,
      }))
    return new Response('[]', { status: 200 })
  }
  try {
    const response = await worker.fetch(authorized('尚未入库的小词'), {})
    assert.equal(response.status, 200)
    assert.equal((await response.json()).items.length, 1)
    assert.ok(calls.length > 0)
  } finally { globalThis.fetch = original }
})
