import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import ts from 'typescript'

const root = new URL('../', import.meta.url)
const app = await readFile(new URL('../src/App.vue', import.meta.url), 'utf8')
const manifest = JSON.parse(await readFile(new URL('../public/learner-lexicon/manifest.json', import.meta.url), 'utf8'))
const records = {}

test('word collections are reproducible, fingerprinted, at least 3,000 each, and sourced', async () => {
  assert.equal(manifest.version, 1)
  for (const language of ['ja','en']) {
    const path = manifest[language]
    assert.match(path, new RegExp('^/learner-lexicon/'+language+'\\.[a-f0-9]{16}\\.json$'))
    const raw = await readFile(new URL('public'+path,root), 'utf8')
    const actualHash = createHash('sha256').update(raw.trimEnd()).digest('hex').slice(0,16)
    assert.equal(path, '/learner-lexicon/'+language+'.'+actualHash+'.json')
    const items = JSON.parse(raw).items
    records[language] = items
    assert.equal(items.length, 3010)
    assert.equal(items.filter(row=>row.source_type==='licensed').length,3000)
    assert.equal(items.filter(row=>row.source_type==='generated').length,10)
    assert.equal(new Set(items.map(row=>row.term.normalize('NFKC').toLowerCase())).size,items.length)
    for (const item of items) {
      assert.equal(item.language,language)
      assert.ok(item.meaning_zh.trim() && item.term.trim())
      if(item.source_type==='generated') {
        assert.ok(item.explanation.length>=14,item.term)
        assert.ok(item.example.length>=22,item.term)
        assert.ok(item.example_meaning_zh.length>=10,item.term)
      }
    }
  }
})

test('static known-word lookup avoids the Worker and D1, and only fetches one cached asset per language', async () => {
  const originalFetch = globalThis.fetch
  const calls = []
  globalThis.fetch = async (input) => {
    const path = String(input)
    calls.push(path)
    if (!path.startsWith('/learner-lexicon/')) throw new Error('Unexpected Worker / D1 request: '+path)
    return new Response(await readFile(new URL('public'+path,root),'utf8'),{
      headers:{'content-type':'application/json'},
    })
  }
  try {
    const content = await readFile(new URL('../src/static-learner-dictionary.ts',import.meta.url),'utf8')
    const js = ts.transpile(content,{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext})
    const api = await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'))
    const first = await api.findStaticLearnerEntry('root cause','en')
    assert.equal(first.term,'root cause')
    assert.match(first.zh,/根本原因/)
    assert.equal(first.translationJa,'根本原因')
    assert.ok(first.usageNote.length>20)
    assert.equal(first.exampleTranslationZh.includes('根本原因'),true)
    const fetched = calls.length
    assert.equal(fetched,2,'first English lookup requires manifest + one immutable file')
    assert.equal((await api.findStaticLearnerEntry('root cause','auto')).term,'root cause')
    assert.equal((await api.findStaticLearnerEntry('unknown-nonexistent-word','en')),null)
    assert.equal(calls.length,fetched,'subsequent English queries reuse one in-session index')
    const japanese = await api.findStaticLearnerEntry('お手数ですが','auto')
    assert.match(japanese.zh,/麻烦/)
    assert.ok(japanese.exampleTranslationZh)
    assert.equal(calls.length,fetched+1,'Japanese file is loaded only on demand')
    assert.equal(await api.findStaticLearnerEntry('认证','zh'),null)
    assert.equal(await api.findStaticLearnerEntry('認証','auto'),null,'ambiguous kanji must not be guessed')
    assert.equal(calls.length,fetched+1)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('the application checks statically before calling dictionary Worker; missing translations remain opt-in', () => {
  assert.match(app,/await findStaticLearnerEntry\(q, requestedLanguage\)/)
  const lookup = app.slice(app.indexOf('async function lookupDictionary()'),app.indexOf('function clearDictionarySearch()'))
  assert.ok(lookup.indexOf('await findStaticLearnerEntry') < lookup.indexOf("fetch('/api/dictionary?q="))
  assert.match(lookup,/if \(local\) \{[\s\S]*?return[\s\S]*?}\s*}\s*catch/)
  assert.match(app,/function enrichDictionaryTranslation\(\)/)
  assert.match(app,/dictionaryNeedsOnlineTranslation/)
  assert.match(app,/dictionaryLocalHit && !dictionaryLoading/)
})
