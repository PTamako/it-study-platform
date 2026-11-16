import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { stripTypeScriptTypes } from 'node:module'
import vm from 'node:vm'

const src=readFileSync(new URL('../src/App.vue',import.meta.url),'utf8')
function getFunction(start,end){
 const a=src.indexOf(start),b=src.indexOf(end,a+start.length)
 assert.ok(a>=0&&b>a,'Missing function boundary: '+start)
 return stripTypeScriptTypes(src.slice(a,b),{mode:'strip'})
}
function deferred(){
 let resolve
 const promise=new Promise(r=>{resolve=r})
 return {promise,resolve:(v)=>resolve(v)}
}
function env(){
 const records=[{id:'former-owner-a',exam:'SG',date:'2026-11-12',correct:1,total:2},
  {id:'former-owner-b',exam:'FE',date:'2026-11-13',correct:2,total:3}]
 let allowed=true
 const events=[]
 const sandbox={
  legacyOperationGeneration:7,
  legacyWorkCurrent:g=>allowed&&g===sandbox.legacyOperationGeneration,
  legacyWritesAllowed:()=>allowed,
  examRecords:{value:records.map(x=>({...x}))},
  examHistorySyncing:{value:false},cloudDashboardError:{value:''},
  recordsMissingOnCloud:(local,cloud)=>local.filter(x=>!cloud.some(y=>y.id===x.id)),
  mergeExamHistory:()=>{throw Error('stale merge attempted')},
  crypto:{randomUUID:()=>{throw Error('already stable IDs')}},
  localStorage:{setItem:(...args)=>events.push(['set',...args])},
  loadCloudDashboard:()=>{throw Error('stale dashboard refresh attempted')},
 }
 const ctx=vm.createContext(sandbox)
 return {ctx,sandbox,records,events,lock(){allowed=false;sandbox.legacyOperationGeneration++}}
}
test('bulk legacy exam history stops after first in-flight upload on identity change',async()=>{
 const x=env(),pending=deferred(),calls=[]
 x.sandbox.fetch=async(url,options={})=>{
  calls.push([url,options.method||'GET'])
  if(!options.method)return {ok:true,json:async()=>({items:[]})}
  return pending.promise
 }
 const source=getFunction('let examHistorySyncGeneration: number | null = null',
  'async function saveExamRecord(')
 vm.runInContext(source+'\nthis.invoke=syncExamHistory',x.ctx)
 const uploading=x.ctx.invoke()
 for(let n=0;n<20&&calls.length<2;n++)await new Promise(r=>setImmediate(r))
 assert.deepEqual(calls,[['/api/exam-history','GET'],['/api/exam-history','POST']])
 x.lock()
 pending.resolve({ok:true,json:async()=>({})})
 await uploading
 assert.equal(calls.length,2,'second old history item must never be uploaded after switch')
 assert.equal(x.sandbox.examRecords.value.length,2)
 assert.deepEqual(x.sandbox.examRecords.value.map(y=>y.id),x.records.map(y=>y.id))
 assert.deepEqual(x.events,[])
 assert.equal(x.sandbox.cloudDashboardError.value,'')
})
test('delayed exam deletion receipt cannot erase former user local records',async()=>{
 const x=env(),pending=deferred(),calls=[]
 x.sandbox.window={confirm:()=>true,prompt:()=> '清除',alert:()=>{throw Error('stale UI')}}
 x.sandbox.fetch=async(url,options)=>{
  calls.push([url,options.method])
  return {ok:true,json:()=>pending.promise}
 }
 const method=getFunction('async function removeExamRecords() {','\ntype PracticeOption')
 vm.runInContext(method+'\nthis.invoke=removeExamRecords',x.ctx)
 const action=x.ctx.invoke()
 for(let n=0;n<20&&calls.length<1;n++)await new Promise(r=>setImmediate(r))
 assert.deepEqual(calls,[['/api/exam-history','DELETE']])
 x.lock()
 pending.resolve({})
 await action
 assert.equal(x.sandbox.examRecords.value.length,2)
 assert.deepEqual(x.events,[])
 assert.equal(x.sandbox.cloudDashboardError.value,'')
 await x.ctx.invoke()
 assert.equal(calls.length,1,'logged-out user cannot initiate a new delete')
})
test('legacy exam history calls are bound to the login epoch before writing',()=>{
 assert.match(src,/let examHistorySyncGeneration: number \| null = null/)
 assert.match(src,/for \(const record of missing\) \{\s*if\(!legacyWorkCurrent\(generation\)\)return/)
 assert.match(src,/if\(examHistorySyncGeneration===generation\)\{/)
 assert.match(src,/async function saveExamRecord\(record: ExamRecord\) \{\s*const generation=legacyOperationGeneration/)
 assert.match(src,/async function removeExamRecords\(\) \{\s*if\(!legacyWritesAllowed\(\)\)return/)
 assert.match(src,/if \(confirmation !== '清除'\|\|!legacyWorkCurrent\(generation\)\) return/)
})
