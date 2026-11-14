import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { stripTypeScriptTypes } from 'node:module'
import vm from 'node:vm'

// Run actual Vue method bodies against a deferred server response. A call
// started under the legacy login must never clear the saved offline queue
// if HomeFlow becomes the active user before its response arrives.
const app=readFileSync(new URL('../src/App.vue',import.meta.url),'utf8')
function method(start,end){
 const a=app.indexOf(start),b=app.indexOf(end,a+start.length)
 assert.ok(a>=0&&b>a,'Missing real legacy offline queue method: '+start)
 return stripTypeScriptTypes(app.slice(a,b),{mode:'strip'})
}
const suites=[
 {
  label:'mock exam',start:'async function syncPendingMockSubmission() {',
  end:'async function finishMockExam(',method:'syncPendingMockSubmission',
  key:'zhixue:mock-pending-v1',pending:{submission_id:'old-mock',answers:[{question_id:'q1',answer:'a'}],track:'exam-sg',study_date:'2026-11-14'},
  reply:{submission_id:'old-mock',correct_count:1,total:1,review:[{id:'q1',answer:'a',explanation:'OK'}]},
  busy:'mockSyncing',error:'mockError',
 },
 {
  label:'scenario',start:'async function syncPendingScenarioAttempt() {',
  end:'async function submitScenario(',method:'syncPendingScenarioAttempt',
  key:'zhixue:scenario-pending-v1',pending:{attempt_id:'old-scenario',scenario_id:'s1',selected_option:'a',duration_seconds:0},
  reply:{attempt_id:'old-scenario',score:100,best_option:'a',correct:true,feedback:'OK'},
  busy:'scenarioSubmitting',error:'scenariosError',
 },
 {
  label:'practice answer',start:'async function syncPendingPracticeAttempt() {',
  end:'async function submitPracticeAnswer(',method:'syncPendingPracticeAttempt',
  key:'zhixue:practice-pending-v1',pending:{attempt_id:'old-practice',question_id:'q1',answer:'a',duration_seconds:0},
  reply:{attempt_id:'old-practice',progress:{question_id:'q1',correct_streak:1}},
  busy:'practiceSaving',error:'quizError',
 },
]
for (const item of suites){
 test('late '+item.label+' receipt never erases the prior account offline queue',async()=>{
  const stored=JSON.stringify(item.pending), writes=[]
  let resolveReply, requests=0, permitted=true
  const storage={
   removeItem:k=>writes.push(['remove',k]),
   setItem:(k,v)=>writes.push(['set',k,v]),
  }
  const state={
   legacyOperationGeneration:8,
   legacyWorkCurrent:g=>permitted&&g===state.legacyOperationGeneration,
   authenticated:{value:true},
   mockSyncing:{value:false},scenarioSubmitting:{value:false},practiceSaving:{value:false},
   mockPendingSubmission:{value:item.pending},pendingScenarioAttempt:{value:item.pending},
   pendingPracticeAttempt:{value:item.pending},
   scenarioSubmissionId:0,
   currentScenario:{value:{id:'s1'}},
   scenarioResult:{value:null},
   examRecords:{value:[]},mockQuestions:{value:[]},
   questionProgressById:{value:{}},
   [item.error]:{value:''},
   mockError:{value:''},scenariosError:{value:''},quizError:{value:''},
   localStorage:storage,
   fetch:async()=>{
    requests++
    return {ok:true,json:()=>new Promise(resolve=>{resolveReply=resolve})}
   },
   readStored:()=>null,
   MOCK_REVIEW_KEY:'zhixue:mock-review-v1',
   loadCloudDashboard:()=>{throw Error('must not refresh after identity change')},
   translateScenarioExplanation:()=>{throw Error('must not translate old actor result')},
  }
  const ctx=vm.createContext(state)
  vm.runInContext(method(item.start,item.end)+'\nthis.invoke='+item.method,ctx)
  const task=ctx.invoke()
  // Yield until fetch resolves and the JSON response is pending.
  for(let n=0;n<8&&!resolveReply;n++)await new Promise(r=>setImmediate(r))
  assert.equal(requests,1)
  assert.equal(typeof resolveReply,'function')
  state.legacyOperationGeneration++
  permitted=false
  state[item.busy].value=false // quarantineLegacyStudy explicitly clears stale UI locks
  resolveReply(item.reply)
  await task
  assert.equal(state[item.busy].value,false)
  assert.equal(state[item.error].value,'')
  assert.equal(state.mockPendingSubmission.value,item.pending)
  assert.equal(state.pendingScenarioAttempt.value,item.pending)
  assert.equal(state.pendingPracticeAttempt.value,item.pending)
  assert.deepEqual(writes,[])
  // The offline bytes are not touched when HomeFlow takes over.
  assert.equal(stored,JSON.stringify(item.pending))
  await ctx.invoke()
  assert.equal(requests,1,'no old owner queue replay under HomeFlow')
 })
}
test('three offline submission entry points are locked before creating a new pending record',()=>{
 for(const start of ['async function finishMockExam(autoSubmit = false) {',
   'async function submitScenario() {','async function submitPracticeAnswer() {']){
  const idx=app.indexOf(start)
  assert.ok(idx>=0)
  assert.match(app.slice(idx,idx+250),/if\s*\(!legacyWritesAllowed\(\)/)
 }
 assert.match(app,/function quarantineLegacyStudy\(userId:string\)\{\s*legacyOperationGeneration\+\+/)
 assert.match(app,/if\(mockTimer\)\{clearInterval\(mockTimer\);mockTimer=undefined\}/)
 assert.match(app,/function legacyWorkCurrent\(generation:number\)/)
 assert.match(app,/generation===legacyOperationGeneration&&legacyWritesAllowed\(\)/)
})
