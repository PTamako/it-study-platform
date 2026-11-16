import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {stripTypeScriptTypes} from 'node:module'

const source=readFileSync(new URL('../src/homeflow-classic-fetch.ts',import.meta.url),'utf8')
const {createClassicStudyFetch}=await import('data:text/javascript,'+
 encodeURIComponent(stripTypeScriptTypes(source,{mode:'strip'})))
const alice='11111111-1111-4111-8111-111111111111'
const bob='22222222-2222-4222-8222-222222222222'
function response(obj,status=200){return new Response(JSON.stringify(obj),{status,
 headers:{'content-type':'application/json'}})}
function withHost(fn){
 const originalFetch=globalThis.fetch,originalLocation=globalThis.location
 globalThis.location={origin:'https://study.example'}
 return Promise.resolve().then(fn).finally(()=>{
  globalThis.fetch=originalFetch
  if(originalLocation===undefined)delete globalThis.location
  else globalThis.location=originalLocation
 })
}
test('the original dashboard UI uses actor-specific data and frozen session assertion',()=>withHost(async()=>{
 let actor=alice,request=null
 globalThis.fetch=async(path,opts)=>{request={path,opts};return response({
  scope:'user',actor_user_id:alice,exam:{attempted_questions:3}})}
 const adapter=createClassicStudyFetch(()=>actor)
 const a=await adapter.request('/api/dashboard')
 assert.equal(a.status,200)
 assert.equal(request.path,'/api/homeflow-classic/dashboard')
 assert.equal(new Headers(request.opts.headers).get('x-zhixue-expected-actor'),alice)
 actor=bob
 const b=await adapter.request('/api/dashboard')
 assert.equal(b.status,409,'response tied to a different actor must be discarded')
}))
test('a pending response from a former user cannot become the next user result',()=>withHost(async()=>{
 let actor=alice,resolve
 globalThis.fetch=()=>new Promise(r=>resolve=r)
 const adapter=createClassicStudyFetch(()=>actor)
 const pending=adapter.request('/api/homeflow-study/daily-tasks')
 for(let n=0;n<15&&!resolve;n++)await new Promise(r=>setImmediate(r))
 assert.equal(typeof resolve,'function')
 actor=bob
 resolve(response({ok:true,scope:'user',actor_user_id:alice,items:[{completed:true}]}))
 const received=await pending
 assert.equal(received.status,409)
 assert.equal((await received.json()).code,'ACCOUNT_CHANGED')
}))
test('unmapped SSO personal endpoints fail closed; legacy remains independent',()=>withHost(async()=>{
 let actor=alice,calls=[]
 globalThis.fetch=async(path)=>{calls.push(path);return response({ok:true})}
 const adapter=createClassicStudyFetch(()=>actor)
 const unknown=await adapter.request('/api/unscoped-private')
 assert.equal(unknown.status,403)
 assert.deepEqual(calls,[])
 actor=null
 const legacy=await adapter.request('/api/old-legacy-progress')
 assert.equal(legacy.status,200)
 assert.deepEqual(calls,['/api/old-legacy-progress'])
}))
test('original question mastery uses isolated actor optimistic version',()=>withHost(async()=>{
 let actor=alice,calls=[]
 globalThis.fetch=async(path,opts)=>{
  calls.push({path,opts})
  if(opts.method==='POST')return response({ok:true,scope:'user',
   actor_user_id:alice,progress:{question_id:'q1',version:4,mastered:1}})
  return response({scope:'user',actor_user_id:alice,items:[
   {question_id:'q1',version:3,mastered:0}]})
 }
 const adapter=createClassicStudyFetch(()=>actor)
 const r=await adapter.request('/api/question-progress?track=exam-sg')
 assert.equal(r.status,200)
 const w=await adapter.request('/api/question-progress',{method:'POST',
  body:JSON.stringify({question_id:'q1',mastered:true})})
 assert.equal(w.status,200)
 const data=JSON.parse(calls[1].opts.body)
 assert.deepEqual(data,{expected_user_id:alice,question_id:'q1',
  mastered:true,expected_version:3})
 assert.equal(new Headers(calls[1].opts.headers).get('x-zhixue-expected-actor'),alice)
}))
test('cross-user server response and wrong scope are rejected',()=>withHost(async()=>{
 let actor=alice
 const adapter=createClassicStudyFetch(()=>actor)
 globalThis.fetch=async()=>response({scope:'user',actor_user_id:bob,items:[]})
 assert.equal((await adapter.request('/api/language-review')).status,409)
 globalThis.fetch=async()=>response({scope:'legacy',items:[]})
 assert.equal((await adapter.request('/api/language-progress')).status,409)
}))
