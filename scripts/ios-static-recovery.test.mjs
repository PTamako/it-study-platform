import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import ts from 'typescript'
import { runInNewContext } from 'node:vm'

const source=readFileSync(new URL('../src/published-study-assets.ts',import.meta.url),'utf8')
const compiled=ts.transpileModule(source,{
 compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}
}).outputText
const {fetchPublishedStudyItems}=await import('data:text/javascript;base64,'+
 Buffer.from(compiled).toString('base64'))
const sw=readFileSync(new URL('../public/sw.js',import.meta.url),'utf8')

const json=data=>new Response(JSON.stringify(data),{
 status:200,headers:{'content-type':'application/json;charset=UTF-8'}
})
const spa=()=>new Response('<!doctype html><html><title>知学</title></html>',{
 status:200,headers:{'content-type':'text/html;charset=UTF-8'}
})
const hash='aabbccddeeff0011'
const oldHash='1111111111111111'
const pack=(kind,language,count)=>({
 items:Array.from({length:count},(_,i)=>({
  language,term:language+'-'+i,id:kind+'-'+i,meaning_zh:'中文'
 }))
})
const manifest=(kind,language,old=false)=>({
 version:1,ja:'/'+kind+'/ja.'+(old?oldHash:hash)+'.json',
 en:'/'+kind+'/en.'+(old?oldHash:hash)+'.json'
})

test('iPhone SPA HTML fallback never becomes a JSON lesson: fresh manifest restores both 5,000 decks',async()=>{
 const original=globalThis.fetch
 try{
  for(const lang of ['ja','en']){
   const seen=[]
   globalThis.fetch=async(input,init={})=>{
    const path=String(input);seen.push({path,cache:init.cache})
    if(path==='/language-cards/manifest.json')return json(manifest('language-cards',lang,true))
    if(path.includes('1111111111111111'))return spa()
    if(path.startsWith('/language-cards/manifest.json?zhixue_recovery='))
     return json(manifest('language-cards',lang))
    if(path.startsWith('/language-cards/'+lang+'.'+hash+'.json?zhixue_recovery='))
     return json(pack('language-cards',lang,5000))
    throw Error('unexpected request: '+path)
   }
   const cards=await fetchPublishedStudyItems('language-cards',lang)
   assert.equal(cards.length,5000)
   assert.equal(seen.length,4)
   assert.ok(seen[2].path.includes('zhixue_recovery='))
   assert.equal(seen[2].cache,'reload')
   assert.equal(seen[3].cache,'reload')
   assert.ok(seen.every(({path})=>!path.includes('/api/')),'no D1 or private read')
  }
 }finally{globalThis.fetch=original}
})

test('recovery works for Japanese and English daily lexicons without guessed definitions',async()=>{
 const original=globalThis.fetch
 try{
  for(const lang of ['ja','en']){
   const seen=[]
   globalThis.fetch=async(input)=>{
    const path=String(input);seen.push(path)
    if(path==='/learner-lexicon/manifest.json')return json(manifest('learner-lexicon',lang,true))
    if(path.includes(oldHash))return spa()
    if(path.includes('manifest.json?zhixue_recovery='))return json(manifest('learner-lexicon',lang))
    if(path.includes(lang+'.'+hash+'.json?zhixue_recovery='))
     return json(pack('learner-lexicon',lang,3010))
    throw Error('unexpected request: '+path)
   }
   const cards=await fetchPublishedStudyItems('learner-lexicon',lang)
   assert.equal(cards.length,3010)
   assert.equal(seen.length,4)
   assert.equal(cards[0].meaning_zh,'中文')
  }
 }finally{globalThis.fetch=original}
})

test('an invalid or missing corpus produces an actionable Chinese error, not Safari native SyntaxError',async()=>{
 const original=globalThis.fetch
 let seen=0
 globalThis.fetch=async()=>{seen++;return spa()}
 try{
  await assert.rejects(fetchPublishedStudyItems('language-cards','ja'),err=>{
   assert.match(err.message,/日英课程加载失败/)
   assert.match(err.message,/更新并刷新/)
   assert.doesNotMatch(err.message,/The string did not match/)
   return true
  })
  assert.equal(seen,2,'invalid manifest retried only once')
 }finally{globalThis.fetch=original}
})

test('abort after an account or language switch does not request a fresh manifest',async()=>{
 const original=globalThis.fetch,controller=new AbortController(),requests=[]
 globalThis.fetch=async input=>{requests.push(String(input));controller.abort();throw Error('cancelled')}
 try{
  await assert.rejects(fetchPublishedStudyItems('language-cards','ja',controller.signal))
  assert.equal(requests.length,1)
 }finally{globalThis.fetch=original}
})

test('PWA v5 removes stale prior caches and only stores valid study JSON',()=>{
 assert.match(sw,/const CACHE_NAME = 'zhixue-app-v5'/)
 assert.match(sw,/key\.startsWith\('zhixue-'\) && key !== CACHE_NAME/)
 assert.match(sw,/path\.endsWith\('\.json'\)/)
 assert.match(sw,/not-a-static-manifest/)
 assert.match(sw,/url\.pathname === '\/language-cards\/manifest\.json'/)
 assert.match(sw,/url\.pathname === '\/learner-lexicon\/manifest\.json'/)
 assert.match(sw,/cache:'no-store'/)
 assert.doesNotMatch(sw,/caches\.delete\('zhixue:actor/)
})

test('PWA does not intercept or persist timestamped version checks',()=> {
 const handlers={}
 runInNewContext(sw, {
   self:{
     location:{origin:'https://study.example'},
     addEventListener(name,callback){handlers[name]=callback},
   },
   URL,Response,Request,
 })
 let intercepted=false
 handlers.fetch({
   request:new Request('https://study.example/version.json?ts=99999'),
   respondWith(){intercepted=true},
   waitUntil(){intercepted=true},
 })
 assert.equal(intercepted,false,'version queries must bypass the worker cache')
 assert.match(sw,/cachedRequests\.filter\(request =>/)
 assert.match(sw,/pathname === '\/version\.json'/)
})
