import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import {stripTypeScriptTypes} from 'node:module'

const app=fs.readFileSync(new URL('../src/App.vue',import.meta.url),'utf8')
function real(a,b){
 const start=app.indexOf(a),end=app.indexOf(b,start+a.length)
 assert.ok(start>=0&&end>start,'Could not locate legacy function: '+a)
 return stripTypeScriptTypes(app.slice(start,end),{mode:'strip'})
}
const dashboard=real('async function loadCloudDashboard() {',
 'const dailyTaskSaveQueues = new Map')
const daily=real('async function saveDailyTask(task: StudyTask, previousDone: boolean, replay?: PendingDailyTask) {',
 'let dailyHydrationRun = 0')
function deferred(){
 let resolve
 const promise=new Promise(r=>resolve=r)
 return {promise,resolve:v=>resolve(v)}
}
function setup(){
 const records=[]
 const pending=new Map(),dailyTaskSaveQueues=new Map(),dailyTaskSaveRequestIds=new Map()
 let refreshes=0
 const state={
  pendingDailyTasks:pending,dailyTaskSaveQueues,dailyTaskSaveRequestIds,
  todayKey:{value:'2026-11-14'},cloudDashboard:{value:{old:true}},
  cloudDashboardError:{value:''},
  localStorage:{setItem:(k,v)=>records.push([k,v])},
  fetch:()=>{throw Error('fetch not configured')},
  persistDailyPending:()=>records.push(['zhixue:daily-pending-v1',JSON.stringify([...pending.values()])]),
  loadCloudDashboard:()=>{refreshes++}
 }
 const ctx=vm.createContext(state)
 vm.runInContext('let legacyOperationGeneration=7;let allowed=true;\n'+
 'function legacyWorkCurrent(g){return allowed&&g===legacyOperationGeneration}\n'+
 'this.lock=()=>{allowed=false;legacyOperationGeneration++};\n'+daily+
 '\nthis.save=saveDailyTask;',ctx)
 return {ctx,state,records,pending,queue:dailyTaskSaveQueues,refreshes:()=>refreshes}
}
test('late successful daily task response preserves former owner pending bytes after HomeFlow switch',async()=>{
 const x=setup(),response=deferred(),calls=[]
 x.state.fetch=async(url,opts)=>{
  calls.push({url,opts})
  return response.promise
 }
 const task=x.ctx.save({id:'sg-review',done:true},false)
 for(let n=0;n<12&&!calls.length;n++)await new Promise(r=>setImmediate(r))
 assert.equal(calls.length,1)
 assert.equal(x.records.length,1)
 x.ctx.lock()
 response.resolve({ok:true,json:async()=>({})})
 await task
 assert.equal(x.pending.size,1)
 assert.equal(x.records.length,1,'old pending record cannot be erased after identity switch')
 assert.equal(x.state.cloudDashboardError.value,'')
 assert.equal(x.refreshes(),0)
 assert.deepEqual(JSON.parse(calls[0].opts.body),{
  task_id:'sg-review',study_date:'2026-11-14',completed:true
 })
})
test('queued daily task save cannot send an old actor request once logout overtakes the queue',async()=>{
 const x=setup(),blocked=deferred()
 x.queue.set('2026-11-14:sg-review',blocked.promise)
 let calls=0
 x.state.fetch=()=>{calls++;return Promise.resolve({ok:true})}
 const task=x.ctx.save({id:'sg-review',done:true},false)
 x.ctx.lock()
 blocked.resolve()
 await task
 assert.equal(calls,0)
 assert.equal(x.pending.size,1)
 assert.equal(x.records.length,1)
})
test('normal legacy task response still clears original stable pending intent and refreshes dashboard',async()=>{
 const x=setup()
 x.state.fetch=async()=>({ok:true,json:async()=>({})})
 await x.ctx.save({id:'sg-review',done:true},false)
 assert.equal(x.pending.size,0)
 assert.deepEqual(x.records.map(x=>JSON.parse(x[1]).length),[1,0])
 assert.equal(x.refreshes(),1)
})
test('late cloud dashboard read cannot replace the next actor statistics or error',async()=>{
 const x=setup(),defer=deferred(),requests=[]
 x.state.fetch=async(url)=>{requests.push(url);return {ok:true,json:()=>defer.promise}}
 vm.runInContext(dashboard+'\nthis.loadDashboard=loadCloudDashboard;',x.ctx)
 const task=x.ctx.loadDashboard()
 assert.deepEqual(requests,['/api/dashboard'])
 x.ctx.lock()
 defer.resolve({today:{tasks_completed:500}})
 await task
 assert.deepEqual(x.state.cloudDashboard.value,{old:true})
 assert.equal(x.state.cloudDashboardError.value,'')
})
test('legacy language mastery callbacks and reviews require the same originating actor',()=>{
 assert.match(app,/async function hydrateCloudProgress\(\) \{\s*const actorGeneration=legacyOperationGeneration/)
 assert.match(app,/const isCurrent = \(\) => generation === masterySyncGeneration &&\s*legacyWorkCurrent\(actorGeneration\)/)
 assert.match(app,/add: ids => \{\s*if\(!isCurrent\(\)\)return/)
 assert.match(app,/const reviewResponse = await fetch\('\/api\/language-review'\)\s*if\(!isCurrent\(\)\)return/)
 assert.match(app,/const reviews = await reviewResponse.json\(\) as \{ items\?: LanguageReview\[\] \}\s*if\(!isCurrent\(\)\)return/)
})
