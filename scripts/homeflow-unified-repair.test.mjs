import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {stripTypeScriptTypes} from 'node:module'
import vm from 'node:vm'

const app=readFileSync(new URL('../src/App.vue',import.meta.url),'utf8')
const backend=readFileSync(new URL('../worker/index.ts',import.meta.url),'utf8')
const adapter=readFileSync(new URL('../src/homeflow-classic-fetch.ts',import.meta.url),'utf8')
const examBackend=readFileSync(new URL('../worker/homeflow-exams.ts',import.meta.url),'utf8')
const migration=readFileSync(new URL('../migrations/0194_homeflow_exam_history_purges.sql',import.meta.url),'utf8')

function sourceFunction(start,end){
 const a=app.indexOf(start),b=app.indexOf(end,a+start.length)
 assert.ok(a>=0&&b>a,'missing Vue function '+start)
 return stripTypeScriptTypes(app.slice(a,b),{mode:'strip'})
}
function dailyFixture(language){
 const terms=['one','two','three','four','five']
 const selections=[]
 const env={
  studyLanguage:{value:language},todayKey:{value:'2026-11-17'},
  authenticated:{value:false},studyAuthenticated:{value:true},
  homeflowIdentityUser:{value:'11111111-1111-4111-8111-111111111111'},
  dailyWordSyncState:{value:'ready'},dailyWordSyncRevision:{value:1},
  dailyEnglishWords:{value:[]},dailyEnglishWordsError:{value:''},
  dailyJapaneseWords:{value:[]},dailyJapaneseWordsError:{value:''},
  dailyEnglishWordRun:0,dailyJapaneseWordRun:0,
  orderedDailyWordTerms:()=>terms,
  findStaticLearnerEntry:async(term,lang)=>({term,language:lang,zh:'含义'}),
  pinDailyWords:(lang,date,words)=>selections.push({lang,date,words:words.map(w=>w.term)}),
  loadJapanesePitchDataset:async()=>null,dictionaryPitchData:{value:null}
 }
 return {ctx:vm.createContext(env),env,selections}
}
test('HomeFlow-only login loads the five Japanese and English terms in the original UI',async()=>{
 const en=dailyFixture('en')
 vm.runInContext(sourceFunction('async function loadDailyBusinessWords() {',
  '\nwatch([studyLanguage, todayKey, dailyWordSyncState, dailyWordSyncRevision, studyAuthenticated, homeflowIdentityUser]')+
  '\nthis.invoke=loadDailyBusinessWords',en.ctx)
 await en.ctx.invoke()
 assert.equal(en.env.dailyEnglishWords.value.length,5)
 assert.equal(en.selections.length,1)

 const ja=dailyFixture('ja')
 vm.runInContext(sourceFunction('async function loadDailyJapaneseWords() {',
  '\nwatch([studyLanguage, todayKey, dailyWordSyncState, dailyWordSyncRevision, studyAuthenticated, homeflowIdentityUser]')+
  '\nthis.invoke=loadDailyJapaneseWords',ja.ctx)
 await ja.ctx.invoke()
 assert.equal(ja.env.dailyJapaneseWords.value.length,5)
 assert.equal(ja.selections.length,1)
})
test('HomeFlow daily words do not read the unscoped legacy five-word selection',()=>{
 assert.match(app,/return \(actor \? 'actor:'\+actor\+':' : ''\)\+date\+':'\+language/)
 assert.match(app,/homeflowIdentityUser \? hydrateClassicActorDailyWords\(homeflowIdentityUser\) : hydrateDailyWordProgress\(\)/)
 assert.match(app,/homeflowIdentityUser\.value && dailyWordSyncState\.value !== 'ready'/)
})
test('GAS translator only runs for authenticated legacy or verified HomeFlow actors',()=>{
 assert.match(backend,/const homeflowActor = !ownerSession &&/)
 assert.match(backend,/await verifiedStudyActor\(request,env\)/)
 assert.match(backend,/if \(!ownerSession && !homeflowActor\)/)
 assert.match(backend,/const authorizedForAppsScript = Boolean\(\(ownerSession \|\| homeflowActor\)/)
})
test('unscoped document bridge is closed when HomeFlow SSO is active',()=>{
 assert.match(backend,/if\(env\.HOMEFLOW_STUDY_SSO_ENABLED==='true'\)\s*return bridgeJson\(\{ok:false,error:'legacy_document_bridge_retired'\},410\)/)
 assert.match(backend,/\/api\/internal\/document-study\/execute/)
})
test('history purge has dual confirmation, scoped actor and immutable audit',()=>{
 assert.match(app,/const confirmation = window\.prompt\('二次确认/)
 assert.match(adapter,/SCOPED_HISTORY_CONFIRMATION_REQUIRED/)
 assert.match(adapter,/method:'DELETE',headers:\{'content-type':'application\/json'\}/)
 assert.match(examBackend,/data\.expected_user_id!==actor\.user_id/)
 assert.match(examBackend,/DELETE FROM homeflow_exam_history WHERE homeflow_user_id=\?/)
 assert.match(examBackend,/INSERT INTO homeflow_exam_history_purges/)
 assert.match(migration,/IMMUTABLE_HISTORY_PURGE_AUDIT/)
 assert.doesNotMatch(migration,/DROP TABLE|DELETE FROM exam_history|UPDATE study_attempts/i)
})
