import test from 'node:test'
import assert from 'node:assert/strict'
import vm from 'node:vm'
import ts from 'typescript'
import { readFile } from 'node:fs/promises'

let source = await readFile(new URL('../worker/index.ts', import.meta.url), 'utf8')
// Tests simulate a real authentication decision: public GETs cannot spend owner quota.
source = source.replace("import { checkWriteRateLimit, handleAuthRequest, requireAuth } from './auth'",
  "const checkWriteRateLimit=async()=>null; const handleAuthRequest=async()=>null; const requireAuth=async(request)=>request.headers.get('x-test-auth')==='yes'?null:new Response('unauthorized',{status:401});")
source = source.replace("import { feSeeds, seedUrl } from './fe-question-bank'",
  "const feSeeds=[]; const seedUrl=()=>'';")
const worker = (await import('data:text/javascript;base64,' + Buffer.from(ts.transpile(source, {
  target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext,
})).toString('base64'))).default

const deployment = 'https://script.google.com/macros/s/AKfycbxPrivateDeployment123/exec'
const redirection = 'https://script.googleusercontent.com/macros/echo?user_content_key=test'
const token = 'test-only-very-long-script-shared-token-1234'
const conf = { GAS_TRANSLATOR_URL: deployment, GAS_TRANSLATOR_TOKEN: token }
const url = term => 'https://study.test/api/dictionary?q=' + encodeURIComponent(term) + '&lang=zh'
const authorized = term => new Request(url(term), { headers: { 'x-test-auth': 'yes' } })

test('logged-in dictionary uses protected Apps Script for Japanese and English; verifies redirect host', async () => {
  const oldFetch = globalThis.fetch
  const posts = []
  const followups = []
  globalThis.fetch = async (input, init = {}) => {
    const u = String(input)
    if (u === deployment) {
      assert.equal(init.method, 'POST')
      assert.equal(init.redirect, 'manual')
      const payload = JSON.parse(init.body)
      assert.equal(payload.token, token)
      assert.equal(payload.text, '今天下大雨')
      assert.equal(payload.source, 'zh')
      assert.ok(['ja', 'en'].includes(payload.target))
      posts.push(payload)
      return new Response('', { status: 302, headers: { location: redirection + '&to=' + payload.target } })
    }
    assert.ok(u.startsWith(redirection))
    assert.equal(init.method, 'GET')
    assert.equal(init.redirect, 'error')
    assert.ok(!('body' in init), 'shared secret is never sent after redirects')
    const dest = new URL(u).searchParams.get('to')
    followups.push(dest)
    return new Response(JSON.stringify({
      ok: true, translation: dest === 'ja' ? '今日は大雨です' : 'It is raining heavily today',
    }), { status: 200 })
  }
  try {
    const resp = await worker.fetch(authorized('今天下大雨'), conf)
    assert.equal(resp.status, 200)
    const body = await resp.json()
    assert.equal(body.items[0].translationJa, '今日は大雨です')
    assert.equal(body.items[0].englishTerm, 'It is raining heavily today')
    assert.equal(posts.length, 2)
    assert.deepEqual(new Set(followups), new Set(['ja', 'en']))
    assert.ok(!JSON.stringify(body).includes(token))
  } finally { globalThis.fetch = oldFetch }
})

test('Apps Script bad token, invalid reply, or quota exhaustion falls back to existing free APIs', async () => {
  const oldFetch = globalThis.fetch
  const calls = []
  globalThis.fetch = async input => {
    const u = String(input)
    calls.push(u)
    if (u === deployment) return new Response(JSON.stringify({ ok: false, error: 'provider_unavailable' }))
    if (u.includes('mymemory.translated.net')) return new Response(JSON.stringify({
      responseData: { translatedText: 'free fallback translation' }, responseStatus: 200,
    }))
    if (u.includes('translate_a/single')) return new Response('[]')
    throw Error(u)
  }
  try {
    const res = await worker.fetch(authorized('临时翻译样例'), conf)
    const body = await res.json()
    assert.equal(res.status, 200)
    assert.equal(body.items[0].translationJa, 'free fallback translation')
    assert.equal(body.items[0].englishTerm, 'free fallback translation')
    assert.equal(calls.filter(x => x === deployment).length, 2)
    assert.ok(calls.some(x => x.includes('mymemory.translated.net')))
    assert.ok(!JSON.stringify(body).includes(token))
  } finally { globalThis.fetch = oldFetch }
})

test('untrusted redirects are not fetched and cannot receive token; fallback is used', async () => {
  const oldFetch = globalThis.fetch
  const calls = []
  globalThis.fetch = async input => {
    const u = String(input)
    calls.push(u)
    if (u === deployment) return new Response('', { status: 302, headers: {
      location: 'https://example.invalid/steal',
    } })
    if (u.includes('mymemory.translated.net')) return new Response(JSON.stringify({
      responseData: { translatedText: 'safe alternative' }, responseStatus: 200,
    }))
    if (u.includes('translate_a/single')) return new Response('[]')
    throw Error('unexpected outbound fetch ' + u)
  }
  try {
    const res = await worker.fetch(authorized('比较复杂的句子'), conf)
    assert.equal((await res.json()).items[0].translationJa, 'safe alternative')
    assert.ok(!calls.some(u => u.includes('example.invalid')))
  } finally { globalThis.fetch = oldFetch }
})

test('anonymous GET and missing token never call owner-deployed Apps Script', async () => {
  const oldFetch = globalThis.fetch
  let scriptCalls = 0
  globalThis.fetch = async input => {
    const u = String(input)
    if (u === deployment) scriptCalls++
    if (u.includes('mymemory.translated.net')) return new Response(JSON.stringify({
      responseData: { translatedText: 'public value' }, responseStatus: 200,
    }))
    if (u.includes('translate_a/single')) return new Response('[]')
    throw Error('unexpected ' + u)
  }
  try {
    const first = await worker.fetch(new Request(url('匿名翻译查询')), conf)
    assert.equal(first.status, 200)
    const second = await worker.fetch(authorized('未配置密钥查词'), { GAS_TRANSLATOR_URL: deployment })
    assert.equal(second.status, 200)
    assert.equal(scriptCalls, 0)
  } finally { globalThis.fetch = oldFetch }
})

test('incorrect/untrusted Apps Script URL is never requested', async () => {
  const oldFetch = globalThis.fetch
  const bad = [
    'http://script.google.com/macros/s/AKfycbx123/exec',
    'https://script.google.com.evil.invalid/macros/s/AKfycbx123/exec',
    'https://script.google.com/macros/s/AKfycbx123/dev',
    'https://script.google.com/macros/s/AKfycbx123/exec?token=bad',
  ]
  globalThis.fetch = async input => {
    const u = String(input)
    assert.ok(!u.includes('script.google.com'), 'malformed script URL must not be fetched')
    if (u.includes('mymemory.translated.net')) return new Response(JSON.stringify({
      responseData: { translatedText: 'available' }, responseStatus: 200,
    }))
    return new Response('[]')
  }
  try {
    for (const candidate of bad) {
      const resp = await worker.fetch(authorized('新的测试短语'), {
        GAS_TRANSLATOR_URL: candidate, GAS_TRANSLATOR_TOKEN: token,
      })
      assert.equal(resp.status, 200)
    }
  } finally { globalThis.fetch = oldFetch }
})

const gasSource = await readFile(new URL('../apps-script/Code.gs', import.meta.url), 'utf8')
function gasContext(secret, onTranslate) {
  const ctx = {
    PropertiesService: { getScriptProperties: () => ({ getProperty: () => secret }) },
    LanguageApp: { translate: onTranslate },
    ContentService: {
      MimeType: { JSON: 'JSON' },
      createTextOutput: value => ({
        value,
        setMimeType() { return this },
      }),
    },
  }
  vm.createContext(ctx)
  vm.runInContext(gasSource, ctx)
  return ctx
}
const event = data => ({ postData: { contents: JSON.stringify(data) } })

test('Google script accepts only a valid shared secret and explicit supported language pair', () => {
  let paidCalls = 0
  const ctx = gasContext(token, (text, from, to) => {
    paidCalls++
    assert.equal(text, '晚上')
    assert.equal(from, 'zh-CN')
    assert.equal(to, 'ja')
    return '夜'
  })
  const ok = JSON.parse(ctx.doPost(event({ token, text: '晚上', source: 'zh', target: 'ja' })).value)
  assert.deepEqual(ok, { ok: true, translation: '夜' })
  const denied = JSON.parse(ctx.doPost(event({
    token: 'bad', text: '晚上', source: 'zh', target: 'ja',
  })).value)
  assert.equal(denied.ok, false)
  const invalid = JSON.parse(ctx.doPost(event({
    token, text: '晚上', source: 'ja', target: 'ja',
  })).value)
  assert.equal(invalid.error, 'invalid_input')
  assert.equal(JSON.parse(ctx.doGet().value).error, 'post_only')
  assert.equal(paidCalls, 1)
})

test('Google script fails closed when no secret configured or Google quota is exhausted', () => {
  const noSecret = gasContext('', () => { throw Error('should not translate') })
  assert.equal(JSON.parse(noSecret.doPost(event({
    token, text: 'hello', source: 'en', target: 'ja',
  })).value).error, 'unauthorized')
  const quota = gasContext(token, () => { throw Error('Service invoked too many times') })
  const result = JSON.parse(quota.doPost(event({
    token, text: 'hello', source: 'en', target: 'ja',
  })).value)
  assert.deepEqual(result, { ok: false, error: 'provider_unavailable' })
  assert.ok(!JSON.stringify(result).includes(token))
})
