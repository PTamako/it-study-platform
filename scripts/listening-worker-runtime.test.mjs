import { inlineChineseDictionary } from './inline-chinese-dictionary.mjs'
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { DatabaseSync } from 'node:sqlite'
import ts from 'typescript'

const root = new URL('../', import.meta.url)
let source = await readFile(new URL('worker/index.ts', root), 'utf8')
source = source.replace("import { checkWriteRateLimit, handleAuthRequest, requireAuth } from './auth'",
  'const checkWriteRateLimit=async()=>null; const handleAuthRequest=async()=>null; const requireAuth=async()=>null;')
source = source.replace("import { feSeeds, seedUrl } from './fe-question-bank'",
  "const feSeeds=[]; const seedUrl=()=>'';")
source = source.replace("import { homeflowStudyIdentity } from './homeflow-identity'",
  'const homeflowStudyIdentity = async () => new Response("SSO disabled",{status:503})')
source = inlineChineseDictionary(source)
const compiled = ts.transpileModule(source, {compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText
const worker = (await import('data:text/javascript;base64,'+Buffer.from(compiled).toString('base64'))).default
const curriculum = await readFile(new URL('src/daily-dialogue-listening.ts',root),'utf8')
const js = ts.transpileModule(curriculum,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText
const {dailyListeningScenes} = await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'))
const schema = await readFile(new URL('migrations/0150_daily_listening_answers.sql',root),'utf8')

function environment() {
  const sqlite = new DatabaseSync(':memory:')
  sqlite.exec(schema)
  const DB = {
    prepare(sql) {
      const bound = params => ({
        first: async () => sqlite.prepare(sql).get(...params) || null,
        run: async () => sqlite.prepare(sql).run(...params),
        all: async () => ({results:sqlite.prepare(sql).all(...params)}),
      })
      return {...bound([]), bind:(...params)=>bound(params)}
    },
  }
  const get = async (date,language='ja') => {
    const url = new URL('/api/listening-progress','https://study.test')
    url.searchParams.set('date',date);url.searchParams.set('language',language)
    const response = await worker.fetch(new Request(url),{DB})
    return {status:response.status,data:await response.json()}
  }
  const post = async (date,language,answers) => {
    const response = await worker.fetch(new Request('https://study.test/api/listening-progress',{
      method:'POST',headers:{origin:'https://study.test','content-type':'application/json'},
      body:JSON.stringify({date,language,answers}),
    }),{DB})
    return {status:response.status,data:await response.json()}
  }
  return {sqlite,get,post}
}

test('six-day original listening rotation is identical to the Worker date-scene whitelist', async () => {
  const state=environment()
  try {
    for (const language of ['ja','en']) for(let d=1;d<=12;d++){
      const date='2026-11-'+String(d).padStart(2,'0')
      const scenes=dailyListeningScenes(date,language)
      assert.equal(scenes.length,2)
      const answers=scenes.map((scene,index)=>({scene_id:scene.id,answer_index:index}))
      const result=await state.post(date,language,answers)
      assert.equal(result.status,200,JSON.stringify({date,language,result}))
      assert.equal(result.data.items.length,2)
    }
    assert.equal(state.sqlite.prepare('SELECT count(*) n FROM daily_listening_answers').get().n,48)
  } finally {state.sqlite.close()}
})

test('another day, invalid date and mismatched language never enter the database', async () => {
  const state=environment()
  try {
    const date='2026-11-04'
    const today=dailyListeningScenes(date,'ja')
    const next=dailyListeningScenes('2026-11-05','ja')
    assert.notEqual(today[0].id,next[0].id)
    for(const [studyDate,language,answers] of [
      [date,'ja',[{scene_id:next[0].id,answer_index:0}]],
      [date,'ja',[{scene_id:'ja-w7',answer_index:0}]],
      [date,'en',[{scene_id:today[0].id,answer_index:0}]],
      ['2026-02-30','ja',[{scene_id:today[0].id,answer_index:0}]],
      [date,'ja',[{scene_id:today[0].id,answer_index:0},{scene_id:today[0].id,answer_index:1}]],
      [date,'ja',[{scene_id:today[0].id,answer_index:9}]],
    ]) {
      const result=await state.post(studyDate,language,answers)
      assert.equal(result.status,400,JSON.stringify({studyDate,language,answers}))
    }
    assert.equal(state.sqlite.prepare('SELECT count(*) n FROM daily_listening_answers').get().n,0)
  } finally {state.sqlite.close()}
})

test('first submission survives conflicting retry; GET returns authoritative two-row snapshot', async () => {
  const state=environment()
  try {
    const date='2026-11-04', scenes=dailyListeningScenes(date,'ja')
    const items=scenes.map((scene,index)=>({scene_id:scene.id,answer_index:index}))
    assert.deepEqual((await state.get(date)).data.items,[])
    const first=await state.post(date,'ja',items)
    assert.equal(first.status,200)
    const retry=await state.post(date,'ja',items.map(x=>({...x,answer_index:3})))
    assert.equal(retry.status,200)
    assert.deepEqual(retry.data.items,first.data.items)
    assert.deepEqual((await state.get(date)).data.items,first.data.items)
    assert.equal(state.sqlite.prepare('SELECT count(*) n FROM daily_listening_answers').get().n,2)
    assert.equal((await state.get('2026-02-30')).status,400)
  } finally {state.sqlite.close()}
})

test('failed or missing listening table does not invent saved cloud success',async()=>{
  const state=environment()
  try {
    state.sqlite.exec('DROP TABLE daily_listening_answers')
    const date='2026-11-04'
    const scene=dailyListeningScenes(date,'ja')[0]
    assert.equal((await state.get(date)).status,503)
    assert.equal((await state.post(date,'ja',[{scene_id:scene.id,answer_index:0}])).status,503)
  } finally {state.sqlite.close()}
})
