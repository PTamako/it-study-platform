import { inlineChineseDictionary } from './inline-chinese-dictionary.mjs'
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { DatabaseSync } from 'node:sqlite'
import { webcrypto } from 'node:crypto'
import ts from 'typescript'

if (!globalThis.crypto) globalThis.crypto = webcrypto
let source = await readFile(new URL('../worker/index.ts', import.meta.url), 'utf8')
source = source.replace("import { checkWriteRateLimit, handleAuthRequest, requireAuth } from './auth'",
  'const checkWriteRateLimit=async()=>null;const handleAuthRequest=async()=>null;const requireAuth=async()=>null;')
source = source.replace("import { feSeeds, seedUrl } from './fe-question-bank'",
  "const feSeeds=[];const seedUrl=()=>'';")
source = inlineChineseDictionary(source)
const worker = (await import('data:text/javascript;base64,' + Buffer.from(ts.transpile(source, {
  target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext,
})).toString('base64'))).default
const migration = await readFile(new URL('../migrations/0113_dictionary_ai_supplement.sql', import.meta.url), 'utf8')

function environment(run = async () => ({ response: '这是 AI 补充：中文翻译、日语用法与英文例句。' })) {
  const sqlite = new DatabaseSync(':memory:')
  sqlite.exec(migration)
  const DB = {
    prepare(sql) {
      const bound = args => ({
        first: async () => sqlite.prepare(sql).get(...args) || null,
        run: async () => sqlite.prepare(sql).run(...args),
        all: async () => ({ results: sqlite.prepare(sql).all(...args) }),
      })
      return { ...bound([]), bind: (...args) => bound(args) }
    },
  }
  let calls=0
  const AI={run:async(...args)=>{calls++;return run(...args)}}
  return {sqlite,DB,AI,get calls(){return calls}}
}
const POST = (term, more={}) => new Request('https://study.test/api/dictionary/ai', {
  method:'POST',
  headers:{origin:'https://study.test','content-type':'application/json'},
  body:JSON.stringify({term,language:'auto',...more}),
})
async function post(env, term, more={}) {
  const response = await worker.fetch(POST(term,more),env)
  return {status:response.status,data:await response.json()}
}
async function status(env) {
  const response=await worker.fetch(new Request('https://study.test/api/dictionary/ai/status'),env)
  return {status:response.status,data:await response.json()}
}

test('migration is idempotent and preserves all existing tables', () => {
  const e=environment()
  e.sqlite.exec(migration)
  assert.equal(e.sqlite.prepare("SELECT count(*) n FROM sqlite_master WHERE name LIKE 'dictionary_ai_%' AND type='table'").get().n,2)
  e.sqlite.close()
})

test('ordinary dictionary lookups do not invoke Workers AI even if AI binding exists', async () => {
  const env=environment()
  const originalFetch=globalThis.fetch
  globalThis.fetch=async()=>new Response(JSON.stringify([]),{status:200})
  try {
    const response=await worker.fetch(new Request('https://study.test/api/dictionary?q=hello&lang=en'),env)
    assert.equal(response.status,200)
    assert.equal(env.calls,0)
  } finally {globalThis.fetch=originalFetch;env.sqlite.close()}
})

test('AI supplement is opt-in, returns a controlled explanation, and caches duplicates without extra quota', async () => {
  const env=environment()
  assert.equal((await status(env)).data.remaining,20)
  const first=await post(env,'認証',{language:'ja',known:{zh:'认证',en:'authentication'}})
  assert.equal(first.status,200)
  assert.equal(first.data.cached,false)
  assert.match(first.data.explanation,/中文翻译/)
  assert.equal(first.data.remaining,19)
  const repeat=await post(env,'認証',{language:'ja',known:{zh:'认证',en:'authentication'}})
  assert.equal(repeat.status,200)
  assert.equal(repeat.data.cached,true)
  assert.equal(repeat.data.remaining,19)
  assert.equal(env.calls,1)
  assert.equal((await status(env)).data.remaining,19)
  env.sqlite.close()
})

test('AI context analysis only uses source-backed pronunciation/POS hints and never guesses pitch', async () => {
  const env = environment(async (model, input) => {
    assert.equal(typeof model, 'string')
    const system = String(input.messages?.find(message => message.role === 'system')?.content || '')
    const user = JSON.parse(input.messages?.find(message => message.role === 'user')?.content || '{}')
    assert.match(system, /不能自行创造或推算音标/)
    assert.match(system, /用户主动触发/)
    assert.deepEqual(user.priorDictionaryHints, {
      zh: '栗子', ja: '栗', en: 'chestnut', partOfSpeech: '名词',
      reading: '', pinyin: 'lì zi', ipa: '',
    })
    return { response: '栗子是名词；日语为栗，英语为 chestnut。' }
  })
  try {
    const result = await post(env, '栗子', {
      language: 'zh', known: {
        zh: '栗子', ja: '栗', en: 'chestnut',
        partOfSpeech: '名词', pinyin: 'lì zi',
      },
    })
    assert.equal(result.status, 200)
    assert.equal(result.data.remaining, 19)
    assert.equal(env.calls, 1)
  } finally { env.sqlite.close() }
})

test('explicit AI translation returns a trilingual dictionary card, shares the quota and caches repetitions', async () => {
  const env = environment(async (_model, input) => {
    assert.equal(_model, '@cf/meta/m2m100-1.2b')
    assert.equal(input.source_lang, 'zh')
    return { translated_text: input.target_lang === 'ja' ? '大切な約束' : 'an important promise' }
  })
  try {
    const first = await post(env, '重要的约定', { language: 'zh', mode: 'translation' })
    assert.equal(first.status, 200)
    assert.equal(first.data.cached, false)
    assert.equal(first.data.items[0].zh, '重要的约定')
    assert.equal(first.data.items[0].translationJa, '大切な約束')
    assert.equal(first.data.items[0].englishTerm, 'an important promise')
    assert.equal(first.data.items[0].source, 'Workers AI（按需翻译）')
    assert.equal(first.data.remaining, 19)
    assert.equal(env.calls, 2, 'one user request runs two language translations')
    const again = await post(env, '重要的约定', { language: 'zh', mode: 'translation' })
    assert.equal(again.status, 200)
    assert.equal(again.data.cached, true)
    assert.equal(again.data.remaining, 19)
    assert.equal(env.calls, 2, 'same translation is served from durable cache')
    assert.equal((await status(env)).data.remaining, 19)
  } finally { env.sqlite.close() }
})

test('failed opt-in AI translations fail visibly and keep their reserved allowance', async () => {
  const env = environment(async () => ({ translated_text: '' }))
  try {
    const result = await post(env, '没有译文的例子', { language: 'zh', mode: 'translation' })
    assert.equal(result.status, 503)
    assert.match(result.data.error, /已计入今日上限/)
    assert.equal(result.data.remaining, 19)
  } finally { env.sqlite.close() }
})

test('dictionary UI offers AI translations by explicit click only and retains normal AI explanations', async () => {
  const app = await readFile(new URL('../src/App.vue', import.meta.url), 'utf8')
  assert.match(app, /async function translateMissingDictionaryWithAi\(\)/)
  assert.match(app, /mode: 'translation'/)
  assert.match(app, /@click="translateMissingDictionaryWithAi"/)
  assert.match(app, /AI 补译为中日英/)
  assert.match(app, /@click="supplementDictionaryWithAi\(null\)"/)
  assert.match(app, /dictionaryAiRemaining === 0/)
})

test('parallel requests cannot exceed 20 paid inference attempts in one JST day', async () => {
  const env=environment()
  const results=await Promise.all(Array.from({length:28},(_,i)=>post(env,'word-'+i)))
  assert.equal(results.filter(x=>x.status===200).length,20)
  assert.equal(results.filter(x=>x.status===429).length,8)
  assert.equal(env.calls,20)
  assert.equal((await status(env)).data.remaining,0)
  const cached=await post(env,'word-0')
  assert.equal(cached.status,200)
  assert.equal(cached.data.cached,true)
  assert.equal(env.calls,20)
  env.sqlite.close()
})

test('invalid input, missing model and provider failure never bypass or silently refund quota', async () => {
  const env=environment(async()=>{throw new Error('upstream failure')})
  assert.equal((await post(env,'')).status,400)
  assert.equal((await post(env,'x'.repeat(101))).status,400)
  assert.equal((await post(env,'hello',{language:'fr'})).status,400)
  assert.equal(env.calls,0)
  const noAi=await post({DB:env.DB},'hello')
  assert.equal(noAi.status,503)
  assert.equal((await status(env)).data.remaining,20)
  const failure=await post(env,'hello')
  assert.equal(failure.status,503)
  assert.equal(failure.data.remaining,19)
  assert.equal(env.calls,1)
  env.sqlite.close()
})

test('AI endpoint is guarded by authentication, CSRF origin check and durable write limiter', async()=>{
  assert.match(source,/['"]\/api\/dictionary\/ai['"]/)
  const guarded=source.slice(source.indexOf("if (protectedPersonalPaths.has(url.pathname))"),
    source.indexOf("const isWriteEndpoint"))
  assert.match(guarded,/requireAuth\(request, env\)/)
  assert.match(guarded,/originMatches/)
  assert.match(guarded,/checkWriteRateLimit\(request, env\)/)
  assert.match(source,/ON CONFLICT\(study_date\) DO UPDATE SET used = used \+ 1 WHERE used < \? RETURNING used/)
  assert.match(source,/env\.AI\.run\(DICTIONARY_AI_MODEL/)
})

test('UI provides contextual AI actions without altering saved word snapshots',async()=>{
  const app=await readFile(new URL('../src/App.vue',import.meta.url),'utf8')
  assert.match(app,/function dictionaryAiKey\(entry: DictionaryEntry \| null\)/)
  assert.match(app,/if \(dictionaryAiBusy\.value \|\| !authenticated\.value\) return/)
  assert.match(app,/dictionaryAiRequestId/)
  assert.match(app,/dictionaryAiAnswers\.value/)
  assert.match(app,/supplementDictionaryWithAi\(entry\)/)
  assert.match(app,/supplementDictionaryWithAi\(null\)/)
  assert.match(app,/AI 仅供参考/)
  assert.match(app,/AI 剩余/)
  assert.match(app,/savedDictionaryEntries/)
})
