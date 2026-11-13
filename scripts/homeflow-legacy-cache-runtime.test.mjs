import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {stripTypeScriptTypes} from 'node:module'
import vm from 'node:vm'

// These functions are deliberately taken from the real Vue source so the
// test exercises actual localStorage persistence code without a browser.
const app=readFileSync(new URL('../src/App.vue',import.meta.url),'utf8')
function extract(from,to){
 const start=app.indexOf(from),end=app.indexOf(to,start+from.length)
 assert.ok(start>=0&&end>start,'expected legacy cache writer in App.vue')
 return stripTypeScriptTypes(app.slice(start,end),{mode:'strip'})
}
function activate(source,globals,name){
 const sandbox=vm.createContext(globals)
 vm.runInContext(source+'\nthis.invoke='+name,sandbox)
 return sandbox.invoke
}

test('active mock exam snapshot remains unchanged for HomeFlow member and unverified legacy user',()=>{
 const writes=new Map(),access={allowed:false}
 const env={
  legacyWritesAllowed:()=>access.allowed,
  mockStarted:{value:true},selectedTrackId:{value:'exam-sg'},
  feMockSection:{value:'A'},mockQuestions:{value:[{id:'q-1'}]},
  mockAnswers:{value:{'q-1':'a'}},mockStartedAt:{value:1000},
  mockDeadline:{value:9000},mockDurationMinutes:{value:30},
  mockStorageWarning:{value:''},MOCK_ACTIVE_KEY:'zhixue:mock-active-v1',
  localStorage:{setItem:(k,v)=>writes.set(k,v)}
 }
 const persist=activate(extract('function persistActiveMockExam() {',
  '\nwatch([mockStarted, mockAnswers]'),env,'persistActiveMockExam')
 persist();assert.equal(writes.size,0)
 access.allowed=true;persist()
 assert.equal(writes.size,1)
 assert.equal(JSON.parse(writes.get('zhixue:mock-active-v1')).track,'exam-sg')
 const original=writes.get('zhixue:mock-active-v1')
 access.allowed=false;env.mockAnswers.value={'q-1':'b'};persist()
 assert.equal(writes.get('zhixue:mock-active-v1'),original,
  'switching HomeFlow user cannot overwrite the original mock snapshot')
})

test('daily-word review and offline queue persist only after verified legacy password',()=>{
 const writes=new Map(),access={allowed:false}
 const env={
  legacyWritesAllowed:()=>access.allowed,
  dailyWordProgress:{value:{'ja:単語':{streak:1}}},
  dailyWordPending:{value:{'ja:単語':{streak:1}}},
  dailyWordSyncError:{value:''},
  localStorage:{setItem:(k,v)=>writes.set(k,v)}
 }
 const persist=activate(extract('function persistDailyWordState() {',
  '\nfunction parseDailyWordCloud'),env,'persistDailyWordState')
 persist();assert.equal(writes.size,0)
 access.allowed=true;persist()
 assert.deepEqual([...writes.keys()].sort(),[
  'zhixue:daily-word-pending-v1','zhixue:daily-word-review-v1'])
 const earlier=[...writes.entries()]
 access.allowed=false
 env.dailyWordPending.value={'en:later':{streak:2}}
 persist();assert.deepEqual([...writes.entries()],earlier,
  'HomeFlow actor never inherits or rewrites former owner's offline queue')
})
