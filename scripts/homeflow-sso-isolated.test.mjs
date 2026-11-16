import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {pathToFileURL} from 'node:url'
import {DatabaseSync} from 'node:sqlite'
import {createHmac,webcrypto} from 'node:crypto'

if(!globalThis.crypto)globalThis.crypto=webcrypto
const dir=mkdtempSync(join(tmpdir(),'study-homeflow-sso-'))
const source=readFileSync(new URL('../worker/homeflow-identity.ts',import.meta.url),'utf8')
 .replace("from './auth'","from './auth.mts'")
writeFileSync(join(dir,'homeflow-identity.mts'),source)
writeFileSync(join(dir,'auth.mts'),readFileSync(new URL('../worker/auth.ts',import.meta.url),'utf8'))
writeFileSync(join(dir,'homeflow-vocabulary.mts'),
 readFileSync(new URL('../worker/homeflow-vocabulary.ts',import.meta.url),'utf8')
  .replace("from './homeflow-identity'","from './homeflow-identity.mts'"))
writeFileSync(join(dir,'homeflow-sentences.mts'),
 readFileSync(new URL('../worker/homeflow-sentences.ts',import.meta.url),'utf8')
  .replace("from './homeflow-identity'","from './homeflow-identity.mts'"))
writeFileSync(join(dir,'homeflow-daily-tasks.mts'),
 readFileSync(new URL('../worker/homeflow-daily-tasks.ts',import.meta.url),'utf8')
  .replace("from './homeflow-identity'","from './homeflow-identity.mts'"))
writeFileSync(join(dir,'homeflow-language.mts'),
 readFileSync(new URL('../worker/homeflow-language.ts',import.meta.url),'utf8')
  .replace("from './homeflow-identity'","from './homeflow-identity.mts'"))
writeFileSync(join(dir,'homeflow-exams.mts'),
 readFileSync(new URL('../worker/homeflow-exams.ts',import.meta.url),'utf8')
  .replace("from './homeflow-identity'","from './homeflow-identity.mts'"))
writeFileSync(join(dir,'homeflow-mock.mts'),
 readFileSync(new URL('../worker/homeflow-mock.ts',import.meta.url),'utf8')
  .replace("from './homeflow-identity'","from './homeflow-identity.mts'"))
writeFileSync(join(dir,'homeflow-mock-receipts.mts'),
 readFileSync(new URL('../worker/homeflow-mock-receipts.ts',import.meta.url),'utf8')
  .replace("from './homeflow-identity'","from './homeflow-identity.mts'"))
const {homeflowStudyIdentity,homeflowStudyReady}=
 await import(pathToFileURL(join(dir,'homeflow-identity.mts')))
const {homeflowVocabulary}=
 await import(pathToFileURL(join(dir,'homeflow-vocabulary.mts')))
const {homeflowSentences}=
 await import(pathToFileURL(join(dir,'homeflow-sentences.mts')))
const {homeflowDailyTasks}=
 await import(pathToFileURL(join(dir,'homeflow-daily-tasks.mts')))
writeFileSync(join(dir,'homeflow-grammar.mts'),
 readFileSync(new URL('../worker/homeflow-grammar.ts',import.meta.url),'utf8')
  .replace("from './homeflow-identity'","from './homeflow-identity.mts'"))
writeFileSync(join(dir,'homeflow-listening.mts'),
 readFileSync(new URL('../worker/homeflow-listening.ts',import.meta.url),'utf8')
  .replace("from './homeflow-identity'","from './homeflow-identity.mts'"))
writeFileSync(join(dir,'homeflow-daily-words.mts'),
 readFileSync(new URL('../worker/homeflow-daily-words.ts',import.meta.url),'utf8')
  .replace("from './homeflow-identity'","from './homeflow-identity.mts'"))
const {homeflowDailyWords}=
 await import(pathToFileURL(join(dir,'homeflow-daily-words.mts')))
const {homeflowListening}=
 await import(pathToFileURL(join(dir,'homeflow-listening.mts')))
const {homeflowGrammar}=
 await import(pathToFileURL(join(dir,'homeflow-grammar.mts')))
const {homeflowLanguage}=
 await import(pathToFileURL(join(dir,'homeflow-language.mts')))
const {homeflowExams}=
 await import(pathToFileURL(join(dir,'homeflow-exams.mts')))
const {homeflowMockExam}=
 await import(pathToFileURL(join(dir,'homeflow-mock.mts')))
const {homeflowMockReceipts}=
 await import(pathToFileURL(join(dir,'homeflow-mock-receipts.mts')))
process.on('exit',()=>{rmSync(dir,{recursive:true,force:true})})
const app='https://study.example.test',hf='https://homeflow.example.test'
const owner='11111111-1111-4111-8111-111111111111'
const member='22222222-2222-4222-8222-222222222222'
const password='correct-legacy-password-for-owner'
const legacySecret='s'.repeat(64)
const encoded=Buffer.from(JSON.stringify({v:1,exp:Math.floor(Date.now()/1000)+600})).toString('base64url')
const legacyCookie=encoded+'.'+createHmac('sha256',legacySecret).update(encoded).digest('base64url')
function sqliteEnv(){
 const raw=new DatabaseSync(':memory:')
 raw.exec('PRAGMA foreign_keys=ON;')
 raw.exec(readFileSync(new URL('../migrations/0180_homeflow_identity_isolation.sql',import.meta.url),'utf8'))
 raw.exec(readFileSync(new URL('../migrations/0181_homeflow_user_vocabulary.sql',import.meta.url),'utf8'))
 raw.exec(readFileSync(new URL('../migrations/0190_homeflow_personal_sentence_cards.sql',import.meta.url),'utf8'))
 raw.exec(readFileSync(new URL('../migrations/0182_homeflow_user_daily_tasks.sql',import.meta.url),'utf8'))
 raw.exec(readFileSync(new URL('../migrations/0133_daily_grammar_answers.sql',import.meta.url),'utf8'))
 raw.exec(readFileSync(new URL('../migrations/0187_homeflow_grammar_answers.sql',import.meta.url),'utf8'))
 raw.exec(readFileSync(new URL('../migrations/0150_daily_listening_answers.sql',import.meta.url),'utf8'))
 raw.exec(readFileSync(new URL('../migrations/0188_homeflow_listening_answers.sql',import.meta.url),'utf8'))
 raw.exec(readFileSync(new URL('../migrations/0152_daily_word_reviews.sql',import.meta.url),'utf8'))
 raw.exec(readFileSync(new URL('../migrations/0189_homeflow_daily_word_reviews.sql',import.meta.url),'utf8'))
 raw.prepare('INSERT INTO daily_word_reviews(word_key,streak,last_date,next_date) VALUES(?,?,?,?)')
  .run('ja:報告',2,'2026-11-01','2026-11-04')
 raw.prepare('INSERT INTO daily_listening_answers(study_date,language,scene_id,answer_index) VALUES(?,?,?,?)')
  .run('2026-11-13','ja','ja-d5',2)
 raw.prepare('INSERT INTO daily_grammar_answers(study_date,language,question_id,answer_index) VALUES(?,?,?,?)')
  .run('2026-11-13','ja','ja-01:today:0',2)
 raw.exec(`CREATE TABLE language_cards(
  id TEXT PRIMARY KEY, language TEXT NOT NULL, content_type TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT '', term TEXT NOT NULL DEFAULT '',
  reading TEXT NOT NULL DEFAULT '', meaning_zh TEXT NOT NULL DEFAULT '',
  example TEXT NOT NULL DEFAULT '', example_meaning_zh TEXT NOT NULL DEFAULT '');
 CREATE TABLE language_card_progress(
  card_id TEXT PRIMARY KEY REFERENCES language_cards(id), mastered INTEGER,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
 CREATE TABLE language_card_reviews(
  card_id TEXT PRIMARY KEY REFERENCES language_cards(id),
  review_count INTEGER,correct_streak INTEGER,
  next_review_at TEXT,last_reviewed_at TEXT,last_result TEXT,last_grade TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);`)
 raw.exec(readFileSync(new URL('../migrations/0183_homeflow_language_progress.sql',import.meta.url),'utf8'))
 raw.exec(`CREATE TABLE study_tracks(id TEXT PRIMARY KEY,kind TEXT,title TEXT,subtitle TEXT);
 CREATE TABLE questions(id TEXT PRIMARY KEY,track_id TEXT REFERENCES study_tracks(id),
 topic TEXT NOT NULL DEFAULT '',difficulty TEXT NOT NULL DEFAULT 'standard',
 question_type TEXT NOT NULL DEFAULT 'single_choice',prompt TEXT NOT NULL DEFAULT '',
 options_json TEXT NOT NULL DEFAULT '[]',answer_json TEXT NOT NULL,
 explanation TEXT NOT NULL DEFAULT '',exam_section TEXT NOT NULL DEFAULT '',
 source_type TEXT NOT NULL DEFAULT 'generated');
 CREATE TABLE study_attempts(id TEXT PRIMARY KEY,question_id TEXT REFERENCES questions(id),
 user_answer_json TEXT NOT NULL,is_correct INTEGER NOT NULL,duration_seconds INTEGER NOT NULL DEFAULT 0,
 answered_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
 CREATE TABLE question_review_state(question_id TEXT PRIMARY KEY REFERENCES questions(id),
 track_id TEXT NOT NULL REFERENCES study_tracks(id),review_count INTEGER NOT NULL DEFAULT 0,
 correct_streak INTEGER NOT NULL DEFAULT 0,last_result TEXT NOT NULL DEFAULT 'again',
 next_review_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,mastered INTEGER NOT NULL DEFAULT 0,
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
 CREATE TABLE exam_history(id TEXT PRIMARY KEY,study_date TEXT NOT NULL,exam_name TEXT NOT NULL,
 question_count INTEGER NOT NULL,correct_count INTEGER NOT NULL,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);`)
 raw.exec(readFileSync(new URL('../migrations/0184_homeflow_exam_progress.sql',import.meta.url),'utf8'))
 raw.exec(readFileSync(new URL('../migrations/0185_homeflow_mock_exam_submissions.sql',import.meta.url),'utf8'))
 raw.exec(readFileSync(new URL('../migrations/0088_mock_exam_submissions.sql',import.meta.url),'utf8'))
 raw.exec(readFileSync(new URL('../migrations/0186_homeflow_mock_receipt_adoption.sql',import.meta.url),'utf8'))
 raw.exec("CREATE TABLE mock_question_pool(question_id TEXT PRIMARY KEY REFERENCES questions(id),track_id TEXT,exam_section TEXT,exam_section_method TEXT,topic TEXT,source_type TEXT,question_kind TEXT,draw_key INTEGER);")
 const tracks=raw.prepare('INSERT INTO study_tracks(id,kind,title) VALUES(?,?,?)')
 tracks.run('exam-sg','exam','SG');tracks.run('exam-fe','exam','FE')
 const question=raw.prepare('INSERT INTO questions(id,track_id,topic,prompt,options_json,answer_json,explanation) VALUES(?,?,?,?,?,?,?)')
 question.run('sg-example-001','exam-sg','安全','最适合的安全措施是哪项？',
  '[{"id":"a","text":"选项 A"},{"id":"b","text":"选项 B"}]','"b"','答案 B 有正确的风险控制')
 question.run('sg-example-002','exam-sg','网络','哪项符合最小权限？',
  '[{"id":"a","text":"全部开放"},{"id":"b","text":"最小权限"}]','"b"','只授予必要权限')
 question.run('fe-example-001','exam-fe','算法','哪项是确定性算法？',
  '[{"id":"a","text":"A"},{"id":"b","text":"B"}]','"a"','正确答案 A')
 // Separate indexed mock paper fixture: 48+12 SG, FE A60, FE B16+4.
 const mockQuestion=raw.prepare('INSERT INTO questions(id,track_id,topic,exam_section,prompt,options_json,answer_json) VALUES(?,?,?,?,?,?,?)')
 const mockPool=raw.prepare('INSERT INTO mock_question_pool(question_id,track_id,exam_section,exam_section_method,topic,source_type,question_kind,draw_key) VALUES(?,?,?,?,?,?,?,?)')
 const allMocks=[
  ...Array.from({length:48},(_,i)=>({id:'sg-mock-a-'+String(i+1).padStart(3,'0'),track:'exam-sg',section:'A',topic:'SG安全'})),
  ...Array.from({length:12},(_,i)=>({id:'sg-mock-b-'+String(i+1).padStart(3,'0'),track:'exam-sg',section:'B',topic:'SG管理'})),
  ...Array.from({length:60},(_,i)=>({id:'fe-mock-a-'+String(i+1).padStart(3,'0'),track:'exam-fe',section:'A',topic:'FE理论'})),
  ...Array.from({length:16},(_,i)=>({id:'fe-mock-b-algo-'+String(i+1).padStart(3,'0'),track:'exam-fe',section:'B',topic:'FE算法与程序设计'})),
  ...Array.from({length:4},(_,i)=>({id:'fe-mock-b-security-'+String(i+1).padStart(3,'0'),track:'exam-fe',section:'B',topic:'FE信息安全'}))
 ]
 for(let i=0;i<allMocks.length;i++){
  const row=allMocks[i]
  mockQuestion.run(row.id,row.track,row.topic,row.section,'题目 '+row.id,
   '[{"id":"a","text":"错误答案"},{"id":"b","text":"正确答案"}]','"b"')
  mockPool.run(row.id,row.track,row.section,'explicit',row.topic,'generated','standard',(i+1)*1000000)
 }
 raw.prepare('INSERT INTO study_attempts(id,question_id,user_answer_json,is_correct) VALUES(?,?,?,?)')
  .run('legacy-attempt-0001','sg-example-001','"a"',0)
 raw.prepare('INSERT INTO question_review_state(question_id,track_id,review_count,correct_streak,last_result,mastered) VALUES(?,?,?,?,?,?)')
  .run('sg-example-001','exam-sg',3,0,'again',0)
 raw.prepare('INSERT INTO exam_history(id,study_date,exam_name,question_count,correct_count) VALUES(?,?,?,?,?)')
  .run('legacy-history-001','2026-11-12','SG 模拟考试',60,41)
 const card=raw.prepare('INSERT INTO language_cards(id,language,content_type,category,term,meaning_zh,example) VALUES(?,?,?,?,?,?,?)')
 card.run('ja-sentence-001','ja','sentence','职场','報告いたします','向您报告','進捗をご報告します。')
 card.run('ja-sentence-002','ja','sentence','日常','少々お待ちください','请稍等','少々お待ちください。')
 card.run('en-sentence-001','en','sentence','Work','Keep me posted','及时同步','Keep me posted.')
 const lp=raw.prepare('INSERT INTO language_card_progress(card_id,mastered) VALUES(?,?)')
 lp.run('ja-sentence-001',1)
 lp.run('en-sentence-001',0)
 const lr=raw.prepare('INSERT INTO language_card_reviews(card_id,review_count,correct_streak,next_review_at,last_reviewed_at,last_result,last_grade) VALUES(?,?,?,?,?,?,?)')
 lr.run('ja-sentence-001',3,0,'2026-11-18 00:00:00','2026-11-12 00:00:00','again','hard')
 lr.run('en-sentence-001',2,2,'2026-11-20 00:00:00','2026-11-12 00:00:00','remembered','remembered')
 raw.exec("CREATE TABLE saved_vocabulary_entries_v2(language TEXT,term TEXT,entry_json TEXT,saved_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,PRIMARY KEY(language,term));")
 raw.exec("CREATE TABLE daily_task_completions(task_id TEXT NOT NULL,study_date TEXT NOT NULL,completed INTEGER NOT NULL DEFAULT 0,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,PRIMARY KEY(task_id,study_date));")
 raw.prepare("INSERT INTO daily_task_completions(task_id,study_date,completed) VALUES(?,?,?)")
  .run('daily-grammar','2026-11-13',1)
 raw.prepare("INSERT INTO daily_task_completions(task_id,study_date,completed) VALUES(?,?,?)")
  .run('daily-listening','2026-11-13',0)
 raw.prepare('INSERT INTO saved_vocabulary_entries_v2(language,term,entry_json) VALUES(?,?,?)')
  .run('ja','報告',JSON.stringify({term:'報告',zh:'报告（原主人的旧生词）'}))
 const db={prepare(sql){
  return {bind(...params){
   return {first:async()=>raw.prepare(sql).get(...params)||null,
     all:async()=>({results:raw.prepare(sql).all(...params)}),
     run:async()=>({meta:{changes:raw.prepare(sql).run(...params).changes}}),
     runSync:()=>({meta:{changes:raw.prepare(sql).run(...params).changes}})}
  },first:async()=>raw.prepare(sql).get()||null}
 },async batch(items){
  raw.exec('BEGIN')
  try{const all=items.map(v=>v.runSync());raw.exec('COMMIT');return all}
  catch(error){raw.exec('ROLLBACK');throw error}
 }}
 const active={user:owner,role:'owner',nickname:'小白',
  family:'primary',valid:true,callCount:0}
 const env={DB:db,AUTH_PASSWORD:password,AUTH_SESSION_SECRET:legacySecret,
  HOMEFLOW_STUDY_SSO_ENABLED:'true',APP_ENV:'production',
  STUDY_PUBLIC_ORIGIN:app,HOMEFLOW_OAUTH_ORIGIN:hf,
  STUDY_SSO_ENCRYPTION_KEY:'a'.repeat(64)}
 env.HOMEFLOW_STUDY_SERVICE={async fetch(request){
  active.callCount++
  assert.equal(request.redirect,'manual')
  assert.equal(request.headers.get('origin'),null)
  const path=new URL(request.url).pathname
  if(path==='/api/oauth/token'){
   const body=new URLSearchParams(await request.text())
   assert.equal(body.get('client_id'),'it-study-platform')
   assert.equal(body.get('redirect_uri'),app+'/api/homeflow-sso/callback')
   assert.equal(body.get('code'),'f'.repeat(64))
   assert.match(body.get('code_verifier'),/^[A-Za-z0-9._~-]{43,128}$/)
   return Response.json({token_type:'Bearer',
    access_token:'e'.repeat(64),expires_in:180,
    session_assertion:active.user===owner?'d'.repeat(64):'c'.repeat(64),
    session_assertion_expires_in:900})
  }
  if(path==='/api/oauth/userinfo'){
   assert.equal(request.headers.get('authorization'),'Bearer '+'e'.repeat(64))
   return Response.json({sub:active.user,user_id:active.user,
    household_id:active.family,role:active.role,
    nickname:active.nickname,audience:'it-study-platform'})
  }
  if(path==='/api/oauth/session-introspect'){
   const body=new URLSearchParams(await request.text())
   assert.equal(body.get('client_id'),'it-study-platform')
   const proof=body.get('session_assertion')
   const who=proof==='d'.repeat(64)?owner:proof==='c'.repeat(64)?member:null
   if(!who||!active.valid)return Response.json({error:'revoked'},{status:401})
   const role=who===active.user?active.role:who===owner?'owner':'member'
   return Response.json({active:true,sub:who,user_id:who,
    household_id:active.family,role,
    nickname:who===active.user?active.nickname:who===owner?'小白':'鸡毛',
    audience:'it-study-platform'})
  }
  throw Error('unexpected HomeFlow route '+path)
 }}
 async function call(action,method='GET',data=null,{legacy=false,secret='',origin=app}={}){
  const requestUrl=app+'/api/homeflow-sso/'+action
  const headers={}
  if(method==='POST'){headers.Origin=origin;headers['Content-Type']='application/json'}
  if(legacy)headers.Cookie='__Host-study_session='+legacyCookie
  if(secret)headers.Cookie='__Host-study_hf='+secret
  return homeflowStudyIdentity(new Request(requestUrl,{method,headers,
   body:method==='POST'?JSON.stringify(data||{}):undefined}),env)
 }
 async function begin(legacy=false){
  const res=await call('start','POST',null,{legacy})
  assert.equal(res.status,200)
  const body=await res.json()
  return body
 }
 async function callback(flow){
  const url=new URL(app+'/api/homeflow-sso/callback')
  url.searchParams.set('state',flow.state)
  url.searchParams.set('code','f'.repeat(64))
  return homeflowStudyIdentity(new Request(url),env)
 }
 async function finish(flow,{legacy=false,proof=flow.resume_secret}={}){
  return call('complete','POST',{state:flow.state,resume_secret:proof},{legacy})
 }
 return {raw,env,active,call,begin,callback,finish}
}
test('disabled by default, no preview and no configuration means no identity access',async()=>{
 const f=sqliteEnv()
 try{
  f.env.HOMEFLOW_STUDY_SSO_ENABLED=undefined
  assert.equal(homeflowStudyReady(f.env,new URL(app)),false)
  assert.equal((await f.call('start','POST')).status,503)
  assert.equal((await (await f.call('status')).json()).enabled,false)
  f.env.HOMEFLOW_STUDY_SSO_ENABLED='true';f.env.APP_ENV='preview'
  assert.equal((await f.call('start','POST')).status,503)
  f.env.APP_ENV='production'
  assert.equal(homeflowStudyReady(f.env,new URL(app)),true)
  assert.equal(f.raw.prepare('SELECT COUNT(*) n FROM homeflow_identity_sessions').get().n,0)
 }finally{f.raw.close()}
})
test('owner must use valid legacy signed study session; Safari callback cannot set PWA cookie',async()=>{
 const f=sqliteEnv()
 try{
  const flow=await f.begin()
  assert.equal(new URL(flow.authorization_url).origin,hf)
  assert.equal(new URL(flow.authorization_url).searchParams.get('code_challenge_method'),'S256')
  assert.equal(new URL(flow.authorization_url).searchParams.has('resume_secret'),false)
  const original=f.raw.prepare('SELECT * FROM saved_vocabulary_entries_v2').all()
  const browser=await f.callback(flow)
  assert.equal(browser.status,200)
  assert.equal(browser.headers.get('set-cookie'),null)
  assert.equal((await f.callback(flow)).status,403)
  assert.equal((await f.finish(flow)).status,403)
  assert.equal(f.raw.prepare('SELECT COUNT(*) n FROM homeflow_identity_links').get().n,0)
  assert.deepEqual(f.raw.prepare('SELECT * FROM saved_vocabulary_entries_v2').all(),original)
 }finally{f.raw.close()}
})
test('owner binds old data once, member receives empty identity-only space; wrong proof replays denied',async()=>{
 const f=sqliteEnv()
 try{
  const first=await f.begin(true)
  assert.equal((await f.callback(first)).status,200)
  assert.equal((await f.finish(first,{legacy:true,proof:'0'.repeat(64)})).status,403)
  const ownerResponse=await f.finish(first,{legacy:true})
  assert.equal(ownerResponse.status,200,await ownerResponse.clone().text())
  const ownerCookie=ownerResponse.headers.get('set-cookie').match(/__Host-study_hf=([0-9a-f]{64})/)[1]
  assert.equal((await f.finish(first,{legacy:true})).status,403)
  assert.equal((await (await f.call('me','GET',null,{secret:ownerCookie})).json()).study_access,false)
  f.active.user=member;f.active.role='member';f.active.nickname='鸡毛'
  const second=await f.begin()
  assert.equal((await f.callback(second)).status,200)
  const memberResponse=await f.finish(second)
  assert.equal(memberResponse.status,200,await memberResponse.clone().text())
  const memberCookie=memberResponse.headers.get('set-cookie').match(/__Host-study_hf=([0-9a-f]{64})/)[1]
  const memberIdentity=await (await f.call('me','GET',null,{secret:memberCookie})).json()
  assert.equal(memberIdentity.identity.user_id,member)
  assert.equal(memberIdentity.study_access,false)
  assert.equal(f.raw.prepare('SELECT COUNT(*) n FROM homeflow_identity_links').get().n,2)
  assert.equal(f.raw.prepare('SELECT COUNT(*) n FROM homeflow_identity_sessions').get().n,2)
  assert.equal(JSON.parse(f.raw.prepare('SELECT entry_json FROM saved_vocabulary_entries_v2').get().entry_json).term,'報告')
  assert.equal(f.raw.prepare('SELECT COUNT(*) n FROM homeflow_identity_audit').get().n,2)
  f.active.valid=false
  assert.equal((await f.call('me','GET',null,{secret:memberCookie})).status,401)
  f.active.valid=true;f.active.role='owner'
  assert.equal((await f.call('me','GET',null,{secret:memberCookie})).status,401)
  f.active.role='member'
  assert.equal((await f.call('me','GET',null,{secret:memberCookie})).status,200)
  assert.equal((await f.call('logout','POST',{}, {secret:memberCookie})).status,200)
  assert.equal((await f.call('me','GET',null,{secret:memberCookie})).status,401)
 }finally{f.raw.close()}
})
test('member cannot join before owner, household mismatch, role change and expired owner proof fail closed',async()=>{
 const f=sqliteEnv()
 try{
  f.active.user=member;f.active.role='member'
  const flow=await f.begin()
  assert.equal((await f.callback(flow)).status,200)
  assert.equal((await f.finish(flow)).status,403)
  assert.equal(f.raw.prepare('SELECT COUNT(*) n FROM homeflow_identity_links').get().n,0)
  f.active.user=owner;f.active.role='owner'
  const other=await f.begin(true)
  assert.equal((await f.callback(other)).status,200)
  f.env.AUTH_SESSION_SECRET='changed-signing-secret-not-the-original'
  assert.equal((await f.finish(other,{legacy:true})).status,403)
  assert.equal(f.raw.prepare('SELECT COUNT(*) n FROM homeflow_identity_links').get().n,0)
 }finally{f.raw.close()}
})



test('Stage E personal sentence cards: same card IDs belong to separate HomeFlow users, idempotent edit/delete and revocation',async()=>{
 const f=sqliteEnv()
 try{
  f.env.HOMEFLOW_STUDY_SENTENCES_ENABLED='true'
  const flow=await f.begin(true);await f.callback(flow)
  const o=await f.finish(flow,{legacy:true})
  assert.equal(o.status,200)
  const oToken=o.headers.get('set-cookie').match(/__Host-study_hf=([a-f0-9]{64})/)[1]
  f.active.user=member;f.active.role='member';f.active.nickname='鸡毛'
  const mFlow=await f.begin();await f.callback(mFlow)
  const m=await f.finish(mFlow)
  assert.equal(m.status,200)
  const mToken=m.headers.get('set-cookie').match(/__Host-study_hf=([a-f0-9]{64})/)[1]
  const call=(cookie,method='GET',body=null,route='',origin=app)=>{
   const headers={Cookie:'__Host-study_hf='+cookie}
   if(method==='POST'){headers.Origin=origin;headers['content-type']='application/json'}
   return homeflowSentences(new Request(app+'/api/homeflow-study/sentences'+route,{
    method,headers,body:method==='POST'?JSON.stringify(body):undefined
   }),f.env)
  }
  const card='a'.repeat(32)
  const base={card_id:card,action:'save',expected_version:0,
   expected_user_id:member,language:'ja',sentence:'今日は仕事が順調です。',
   translation_zh:'今天工作顺利。',notes:'日常'}
  assert.equal((await call(mToken,'POST',{...base,expected_user_id:owner})).status,403)
  assert.equal((await call(mToken,'POST',{...base,actor_user_id:owner})).status,400)
  assert.equal((await call(mToken,'POST',base,'','https://attacker.invalid')).status,403)
  assert.equal((await call(mToken,'POST',base)).status,200)
  const replay=await call(mToken,'POST',base)
  assert.equal((await replay.json()).replayed,true)
  const memberRead=await call(mToken),ownerRead=await call(oToken)
  assert.equal((await memberRead.json()).items.length,1)
  assert.equal((await ownerRead.json()).items.length,0)
  assert.equal((await call(oToken,'POST',{...base,expected_user_id:owner,
   sentence:'別の例文です。',translation_zh:'这是另外的例句。'})).status,200)
  const mine=(await (await call(mToken)).json()).items[0]
  assert.equal(mine.sentence,base.sentence,'same client card ID must not merge cross-user data')
  const updated={...base,expected_version:1,translation_zh:'修改后的个人翻译'}
  assert.equal((await call(mToken,'POST',updated)).status,200)
  assert.equal((await call(mToken,'POST',{...base,expected_version:1,
   translation_zh:'旧版本覆盖'})).status,409)
  const removed={expected_user_id:member,card_id:card,action:'remove',expected_version:2}
  assert.equal((await call(mToken,'POST',removed)).status,200)
  const repeat=await call(mToken,'POST',removed)
  assert.equal((await repeat.json()).replayed,true)
  assert.equal((await (await call(mToken)).json()).items.length,0)
  assert.equal((await (await call(oToken)).json()).items.length,1)
  const count=f.raw.prepare('SELECT COUNT(*) n FROM homeflow_personal_sentence_events WHERE actor_user_id=?').get(member).n
  assert.equal(count,3,'save, edit and remove each create one event, replay none')
  assert.throws(()=>f.raw.prepare('UPDATE homeflow_personal_sentence_events SET actor_user_id=?').run(owner),/IMMUTABLE_SENTENCE_AUDIT/)
  assert.throws(()=>f.raw.prepare('DELETE FROM homeflow_personal_sentence_cards').run(),/SENTENCE_PHYSICAL_DELETE_FORBIDDEN/)
  assert.throws(()=>f.raw.prepare('INSERT INTO homeflow_personal_sentence_cards(homeflow_user_id,card_id,language,sentence_text,updated_by_user_id,updated_at) VALUES(?,?,?,?,?,?)')
   .run(owner,'b'.repeat(32),'en','A sentence',member,'2026-11-14'),/SENTENCE_OWNER_REQUIRED/)
  const hidden=f.raw.prepare('SELECT * FROM homeflow_personal_sentence_cards WHERE homeflow_user_id=?').all(owner)
  assert.equal(hidden[0].sentence_text,'別の例文です。')
  assert.equal(f.raw.prepare('SELECT source_kind FROM homeflow_personal_sentence_cards WHERE homeflow_user_id=?').get(member).source_kind,'manual')
  f.active.valid=false
  assert.equal((await call(oToken)).status,401)
  assert.equal((await call(mToken,'POST',{...base,expected_version:3})).status,401)
  f.active.valid=true
  f.env.HOMEFLOW_STUDY_SENTENCES_ENABLED='false'
  assert.equal((await call(oToken)).status,503)
  assert.equal((await (await call(oToken,'GET',null,'/status')).json()).enabled,false)
 }finally{f.raw.close()}
})

test('Stage E new vocabulary is per-actor; owner adopts old terms but member starts empty',async()=>{
 const f=sqliteEnv()
 try{
  f.env.HOMEFLOW_STUDY_VOCAB_ENABLED='true'
  // A new HF cookie cannot claim old history until the original owner has
  // proved possession of their still-valid pre-SSO study session.
  const ownerFlow=await f.begin(true)
  await f.callback(ownerFlow)
  const ownerResponse=await f.finish(ownerFlow,{legacy:true})
  assert.equal(ownerResponse.status,200)
  const ownerCookie=ownerResponse.headers.get('set-cookie')
   .match(/__Host-study_hf=([0-9a-f]{64})/)[1]
  const scoped=async(cookie,route='',method='GET',body=null,origin=app)=>{
   const headers={Cookie:'__Host-study_hf='+cookie}
   if(method==='POST'){
    headers.Origin=origin
    headers['Content-Type']='application/json'
   }
   const req=new Request(app+'/api/homeflow-study/vocabulary'+route,{
    method,headers,body:method==='POST'?JSON.stringify({...body,
     expected_user_id:body?.expected_user_id??(cookie===ownerCookie?owner:member)}):undefined
   })
   return homeflowVocabulary(req,f.env)
  }
  let read=await scoped(ownerCookie)
  assert.equal(read.status,200)
  assert.equal((await read.json()).items.length,0,'old words require explicit verified owner adoption')
  const before=f.raw.prepare('SELECT * FROM saved_vocabulary_entries_v2').all()
  const adoption=await scoped(ownerCookie,'/legacy/adopt','POST',{confirm:true})
  assert.equal(adoption.status,200,await adoption.clone().text())
  assert.equal((await adoption.json()).adopted,1)
  assert.equal((await (await scoped(ownerCookie)).json()).items.length,1)
  assert.equal((await (await scoped(ownerCookie,'/legacy/adopt','POST',{confirm:true})).json()).adopted,0)
  assert.deepEqual(f.raw.prepare('SELECT * FROM saved_vocabulary_entries_v2').all(),
   before,'old legacy vocabulary must never be rewritten')
  f.active.user=member;f.active.role='member';f.active.nickname='鸡毛'
  const memberFlow=await f.begin()
  await f.callback(memberFlow)
  const memberResponse=await f.finish(memberFlow)
  assert.equal(memberResponse.status,200)
  const memberCookie=memberResponse.headers.get('set-cookie')
   .match(/__Host-study_hf=([0-9a-f]{64})/)[1]
  read=await scoped(memberCookie)
  assert.equal(read.status,200)
  assert.equal((await read.json()).items.length,0,"member never inherits original owner's vocabulary")
  assert.equal((await scoped(memberCookie,'/legacy/adopt','POST',{confirm:true})).status,403)
  const save=async(cookie,meaning)=>scoped(cookie,'','POST',{
   language:'ja',term:'報告',action:'save',explicit:true,
   entry:{term:'報告',zh:meaning}
  })
  assert.equal((await save(memberCookie,'报告（成员）')).status,200)
  assert.equal((await save(memberCookie,'报告（成员）')).status,200)
  let memberItems=(await (await scoped(memberCookie)).json()).items
  assert.equal(memberItems.length,1)
  assert.equal(memberItems[0].entry.zh,'报告（成员）')
  assert.equal((await save(ownerCookie,'报告（管理员）')).status,200)
  const ownerItems=(await (await scoped(ownerCookie)).json()).items
  assert.equal(ownerItems[0].entry.zh,'报告（管理员）')
  memberItems=(await (await scoped(memberCookie)).json()).items
  assert.equal(memberItems[0].entry.zh,'报告（成员）','duplicate term must not overwrite spouse')
  const remove=()=>scoped(memberCookie,'','POST',{language:'ja',term:'報告',action:'remove'})
  assert.equal((await remove()).status,200)
  assert.equal((await remove()).status,200)
  assert.equal((await (await scoped(memberCookie)).json()).items.length,0)
  const tombstone=(await (await scoped(memberCookie,'?sync=1')).json()).items
  assert.equal(tombstone.length,1)
  assert.equal(tombstone[0].is_deleted,true)
  assert.equal(tombstone[0].entry,null)
  assert.equal((await (await scoped(ownerCookie)).json()).items[0].entry.zh,'报告（管理员）')
  assert.deepEqual(f.raw.prepare('SELECT * FROM saved_vocabulary_entries_v2').all(),
   before,'old owner source history preserved even after member deletes same term')
  assert.equal(f.raw.prepare("SELECT COUNT(*) n FROM homeflow_vocabulary_events WHERE actor_user_id=? AND action='legacy_adopted'").get(owner).n,1)
  assert.equal(f.raw.prepare("SELECT COUNT(*) n FROM homeflow_vocabulary_events WHERE actor_user_id=? AND action='removed'").get(member).n,1)
  assert.throws(()=>f.raw.prepare('DELETE FROM homeflow_vocabulary_events').run(),/IMMUTABLE_VOCABULARY_AUDIT/)
  assert.throws(()=>f.raw.prepare('INSERT INTO homeflow_saved_vocabulary(homeflow_user_id,language,term,entry_json,updated_by_user_id) VALUES(?,?,?,?,?)')
   .run(owner,'ja','越权','{}',member),/VOCABULARY_OWNER_REQUIRED/)
  f.active.valid=false
  assert.equal((await scoped(memberCookie)).status,401,'revoked HomeFlow source cannot read local terms')
  assert.equal((await save(memberCookie,'不能保存')).status,401)
 }finally{f.raw.close()}
})
test('Stage E vocabulary fails closed on origin, feature gate, invalid payload and cursor',async()=>{
 const f=sqliteEnv()
 try{
  const flow=await f.begin(true);await f.callback(flow)
  const tokenResponse=await f.finish(flow,{legacy:true})
  const auth=tokenResponse.headers.get('set-cookie')
   .match(/__Host-study_hf=([0-9a-f]{64})/)[1]
  const req=(route='',method='GET',body=null,origin=app)=>homeflowVocabulary(
   new Request(app+'/api/homeflow-study/vocabulary'+route,{
    method,headers:{Cookie:'__Host-study_hf='+auth,
     ...(method==='POST'?{Origin:origin,'Content-Type':'application/json'}:{})},
    body:method==='POST'?JSON.stringify({...body,expected_user_id:body?.expected_user_id??owner}):undefined
   }),f.env)
  assert.equal((await req()).status,503,'default OFF')
  f.env.HOMEFLOW_STUDY_VOCAB_ENABLED='true'
  assert.equal((await req('?after=bad')).status,400)
  assert.equal((await req('?limit=200')).status,400)
  assert.equal((await req('','POST',{language:'ja',term:'犬',action:'save',explicit:true,
   entry:{zh:'犬'}},'https://evil.invalid')).status,403)
  assert.equal((await req('','POST',{language:'ja',term:'犬',action:'save',
   entry:{zh:'犬'}})).status,409)
  assert.equal((await req('','POST',{language:'ja',term:'犬',action:'save',
   explicit:true,entry:{zh:'犬',_zhixue_deleted_v1:true}})).status,400)
  assert.equal(f.raw.prepare('SELECT COUNT(*) n FROM homeflow_saved_vocabulary').get().n,0)
  f.env.APP_ENV='preview'
  assert.equal((await req()).status,503)
 }finally{f.raw.close()}
})


test('legacy adoption rejects malformed JSON before copying any part of the page',async()=>{
 const f=sqliteEnv()
 try{
  f.env.HOMEFLOW_STUDY_VOCAB_ENABLED='true'
  const malformed='{not-valid-json'
  f.raw.prepare('INSERT INTO saved_vocabulary_entries_v2(language,term,entry_json) VALUES(?,?,?)')
   .run('en','broken',malformed)
  const original=f.raw.prepare('SELECT * FROM saved_vocabulary_entries_v2 ORDER BY language,term').all()
  const flow=await f.begin(true)
  assert.equal((await f.callback(flow)).status,200)
  const login=await f.finish(flow,{legacy:true})
  assert.equal(login.status,200)
  const cookie=login.headers.get('set-cookie')
   .match(/__Host-study_hf=([0-9a-f]{64})/)[1]
  const adopt=()=>homeflowVocabulary(new Request(
   app+'/api/homeflow-study/vocabulary/legacy/adopt',{
    method:'POST',headers:{Origin:app, Cookie:'__Host-study_hf='+cookie,
     'Content-Type':'application/json'},
    body:JSON.stringify({confirm:true,expected_user_id:owner})
   }),f.env)
  const stopped=await adopt()
  assert.equal(stopped.status,409)
  assert.equal((await stopped.json()).code,'LEGACY_CONTENT_REVIEW_REQUIRED')
  assert.equal(f.raw.prepare('SELECT COUNT(*) n FROM homeflow_saved_vocabulary').get().n,0)
  assert.equal(f.raw.prepare('SELECT COUNT(*) n FROM homeflow_vocabulary_events').get().n,0)
  assert.deepEqual(f.raw.prepare('SELECT * FROM saved_vocabulary_entries_v2 ORDER BY language,term').all(),original)
  // Simulate explicit human repair in the local fixture, not automatic production rewriting.
  f.raw.prepare('UPDATE saved_vocabulary_entries_v2 SET entry_json=? WHERE language=? AND term=?')
   .run(JSON.stringify({term:'broken',zh:'已核验'}),'en','broken')
  const resumed=await adopt()
  assert.equal(resumed.status,200)
  assert.equal((await resumed.json()).adopted,2)
  assert.equal(f.raw.prepare('SELECT COUNT(*) n FROM homeflow_saved_vocabulary').get().n,2)
 }finally{f.raw.close()}
})


async function linkedDailyPair(f){
 const ownerFlow=await f.begin(true)
 assert.equal((await f.callback(ownerFlow)).status,200)
 const ownerLogin=await f.finish(ownerFlow,{legacy:true})
 assert.equal(ownerLogin.status,200,await ownerLogin.clone().text())
 const ownerToken=ownerLogin.headers.get('set-cookie')
  .match(/__Host-study_hf=([0-9a-f]{64})/)[1]
 f.active.user=member;f.active.role='member';f.active.nickname='鸡毛'
 const memberFlow=await f.begin()
 assert.equal((await f.callback(memberFlow)).status,200)
 const memberLogin=await f.finish(memberFlow)
 assert.equal(memberLogin.status,200,await memberLogin.clone().text())
 const memberToken=memberLogin.headers.get('set-cookie')
  .match(/__Host-study_hf=([0-9a-f]{64})/)[1]
 // Test helper tracks the real fixture's signed cookie actor, never a
 // caller-provided body field. Explicit mismatch test payload overrides this.
 f.homeflowActors=new Map([[ownerToken,owner],[memberToken,member]])
 return {ownerToken,memberToken}
}
function scopedDaily(f,cookie,path='',method='GET',data=null,origin=app){
 const headers={}
 if(cookie)headers.Cookie='__Host-study_hf='+cookie
 if(method==='POST'){
  headers.Origin=origin
  headers['Content-Type']='application/json'
 }
 return homeflowDailyTasks(new Request(app+'/api/homeflow-study/daily-tasks'+path,{
  method,headers,body:method==='POST'?JSON.stringify(data??{}):undefined
 }),f.env)
}

test('Stage E daily tasks isolate same date and task between spouses and preserve old source',async()=>{
 const f=sqliteEnv()
 try{
  f.env.HOMEFLOW_STUDY_DAILY_PROGRESS_ENABLED='true'
  assert.equal((await scopedDaily(f,'','?date=2026-11-13')).status,401)
  const {ownerToken,memberToken}=await linkedDailyPair(f)
  const ownerRead=await scopedDaily(f,ownerToken,'?date=2026-11-13')
  assert.equal(ownerRead.status,200)
  assert.deepEqual((await ownerRead.json()).items,[],
   'verified owner must explicitly adopt legacy rows, not implicitly claim them')
  assert.deepEqual((await (await scopedDaily(f,memberToken,'?date=2026-11-13')).json()).items,[])
  const old=f.raw.prepare('SELECT * FROM daily_task_completions ORDER BY study_date,task_id').all()
  assert.equal((await scopedDaily(f,memberToken,'/legacy/adopt','POST',{confirm:true})).status,403)
  const adopted=await scopedDaily(f,ownerToken,'/legacy/adopt','POST',{confirm:true})
  assert.equal(adopted.status,200,await adopted.clone().text())
  assert.equal((await adopted.json()).adopted,2)
  const ownerTasks=(await (await scopedDaily(f,ownerToken,'?date=2026-11-13')).json()).items
  assert.deepEqual(ownerTasks.map(x=>[x.task_id,x.completed,x.version]),
   [['daily-grammar',true,1],['daily-listening',false,1]])
  assert.deepEqual((await (await scopedDaily(f,memberToken,'?date=2026-11-13')).json()).items,[],
   'owner-only historic completions must not leak to spouse')
  const saved=await scopedDaily(f,memberToken,'','POST',{
   task_id:'daily-listening',study_date:'2026-11-13',completed:true,version:0
  })
  assert.equal(saved.status,200,await saved.clone().text())
  assert.equal((await saved.json()).version,1)
  const ownerUnchanged=(await (await scopedDaily(f,ownerToken,'?date=2026-11-13')).json()).items
  assert.equal(ownerUnchanged[1].completed,false)
  const memberTasks=(await (await scopedDaily(f,memberToken,'?date=2026-11-13')).json()).items
  assert.equal(memberTasks.length,1)
  assert.equal(memberTasks[0].completed,true)
  assert.equal(f.raw.prepare('SELECT COUNT(*) n FROM homeflow_daily_task_progress WHERE homeflow_user_id=?').get(member).n,1)
  assert.equal(f.raw.prepare('SELECT COUNT(*) n FROM homeflow_daily_task_progress WHERE homeflow_user_id=?').get(owner).n,2)
  assert.deepEqual(f.raw.prepare('SELECT * FROM daily_task_completions ORDER BY study_date,task_id').all(),old)
  assert.equal(f.raw.prepare("SELECT actor_user_id FROM homeflow_daily_task_events WHERE action='legacy_adopted'").get().actor_user_id,owner)
  assert.equal(f.raw.prepare("SELECT actor_user_id FROM homeflow_daily_task_events WHERE action='completed'").get().actor_user_id,member)
  assert.throws(()=>f.raw.prepare('UPDATE homeflow_daily_task_events SET actor_user_id=?').run(owner),/IMMUTABLE_DAILY_AUDIT/)
  assert.throws(()=>f.raw.prepare('DELETE FROM homeflow_daily_task_events').run(),/IMMUTABLE_DAILY_AUDIT/)
  assert.throws(()=>f.raw.prepare('INSERT INTO homeflow_daily_task_progress(homeflow_user_id,task_id,study_date,completed,updated_by_user_id) VALUES(?,?,?,?,?)')
   .run(owner,'cross-user','2026-11-13',1,member),/DAILY_OWNER_REQUIRED/)
  f.active.valid=false
  assert.equal((await scopedDaily(f,memberToken,'?date=2026-11-13')).status,401,
   'revoking HomeFlow session invalidates all scoped personal reads')
 }finally{f.raw.close()}
})

test('Stage E daily task CAS prevents stale updates, duplicate audit and unauthorized writes',async()=>{
 const f=sqliteEnv()
 try{
  const {memberToken,ownerToken}=await linkedDailyPair(f)
  f.env.HOMEFLOW_STUDY_DAILY_PROGRESS_ENABLED='true'
  const payload={task_id:'task-same-day',study_date:'2026-11-13',completed:true,version:0}
  assert.equal((await scopedDaily(f,memberToken,'','POST',payload,'https://evil.test')).status,403)
  assert.equal((await scopedDaily(f,memberToken,'','POST',{...payload,homeflow_user_id:owner})).status,400)
  assert.equal((await scopedDaily(f,memberToken,'','POST',{...payload,study_date:'2026-02-30'})).status,400)
  assert.equal((await scopedDaily(f,memberToken,'','POST',{...payload,version:1.5})).status,400)
  assert.equal((await scopedDaily(f,memberToken,'?limit=999')).status,400)
  assert.equal((await scopedDaily(f,memberToken,'?date=2026-02-30')).status,400)
  const save=await scopedDaily(f,memberToken,'','POST',payload)
  assert.equal(save.status,200,await save.clone().text())
  assert.equal((await save.json()).version,1)
  const replay=await scopedDaily(f,memberToken,'','POST',payload)
  assert.equal(replay.status,200)
  assert.equal((await replay.json()).replayed,true)
  assert.equal(f.raw.prepare("SELECT COUNT(*) n FROM homeflow_daily_task_events WHERE actor_user_id=?").get(member).n,1)
  const reopen=await scopedDaily(f,memberToken,'','POST',{...payload,completed:false,version:1})
  assert.equal(reopen.status,200,await reopen.clone().text())
  assert.equal((await reopen.json()).version,2)
  assert.equal((await scopedDaily(f,memberToken,'','POST',{...payload,version:1})).status,409,
   'stale tab may not overwrite newer reopened state')
  assert.equal((await scopedDaily(f,memberToken,'','POST',{...payload,version:5})).status,409)
  assert.equal((await scopedDaily(f,memberToken,'','POST',{...payload,completed:false,version:0})).status,200)
  assert.equal(f.raw.prepare("SELECT COUNT(*) n FROM homeflow_daily_task_events WHERE actor_user_id=?").get(member).n,2)
  const row=(await (await scopedDaily(f,memberToken,'?date=2026-11-13')).json()).items[0]
  assert.equal(row.version,2)
  assert.equal(row.completed,false)
  assert.equal((await (await scopedDaily(f,ownerToken,'?date=2026-11-13')).json()).items.length,0)
  f.env.HOMEFLOW_STUDY_DAILY_PROGRESS_ENABLED='false'
  assert.equal((await scopedDaily(f,memberToken,'?date=2026-11-13')).status,503)
  assert.equal((await scopedDaily(f,memberToken,'','POST',payload)).status,503)
 }finally{f.raw.close()}
})

test('Stage E owner daily adoption paginates, fails closed on malformed legacy and never silently skips',async()=>{
 const f=sqliteEnv()
 try{
  f.env.HOMEFLOW_STUDY_DAILY_PROGRESS_ENABLED='true'
  const {ownerToken,memberToken}=await linkedDailyPair(f)
  for(let i=0;i<24;i++){
   f.raw.prepare('INSERT INTO daily_task_completions(task_id,study_date,completed) VALUES(?,?,?)')
    .run('task-'+String(i).padStart(2,'0'),'2026-11-14',i%2)
  }
  const original=f.raw.prepare('SELECT * FROM daily_task_completions ORDER BY study_date,task_id').all()
  const first=await scopedDaily(f,ownerToken,'/legacy/adopt','POST',{confirm:true})
  assert.equal(first.status,200,await first.clone().text())
  const p1=await first.json()
  assert.equal(p1.adopted,20)
  assert.equal(p1.has_more,true)
  assert.deepEqual(Object.keys(p1.next_cursor),['after_date','after_task'])
  const second=await scopedDaily(f,ownerToken,'/legacy/adopt','POST',{
   confirm:true,...p1.next_cursor})
  assert.equal(second.status,200,await second.clone().text())
  const p2=await second.json()
  assert.equal(p2.adopted,6)
  assert.equal(p2.has_more,false)
  assert.equal((await (await scopedDaily(f,ownerToken,'/legacy/adopt','POST',{
   confirm:true,...p1.next_cursor})).json()).adopted,0)
  assert.equal(f.raw.prepare('SELECT COUNT(*) n FROM homeflow_daily_task_progress WHERE homeflow_user_id=?').get(owner).n,26)
  assert.equal(f.raw.prepare('SELECT COUNT(*) n FROM homeflow_daily_task_progress WHERE homeflow_user_id=?').get(member).n,0)
  assert.deepEqual(f.raw.prepare('SELECT * FROM daily_task_completions ORDER BY study_date,task_id').all(),original)
  const counts=f.raw.prepare("SELECT SUM(affected_count) n FROM homeflow_daily_task_events WHERE action='legacy_adopted'").get().n
  assert.equal(counts,26)
  // One damaged row in a newly requested cursor page blocks *all* copies
  // on that page; no cursor or audit should advance until repaired.
  f.raw.prepare('INSERT INTO daily_task_completions(task_id,study_date,completed) VALUES(?,?,?)')
   .run('bad-task','2026-11-15',7)
  f.raw.prepare('INSERT INTO daily_task_completions(task_id,study_date,completed) VALUES(?,?,?)')
   .run('good-task','2026-11-15',1)
  const page={confirm:true,after_date:'2026-11-14',after_task:'task-23'}
  const beforeProgress=f.raw.prepare('SELECT COUNT(*) n FROM homeflow_daily_task_progress').get().n
  const beforeAudit=f.raw.prepare('SELECT COUNT(*) n FROM homeflow_daily_task_events').get().n
  const fail=await scopedDaily(f,ownerToken,'/legacy/adopt','POST',page)
  assert.equal(fail.status,409)
  assert.equal((await fail.json()).code,'LEGACY_PROGRESS_REVIEW_REQUIRED')
  assert.equal(f.raw.prepare('SELECT COUNT(*) n FROM homeflow_daily_task_progress').get().n,beforeProgress)
  assert.equal(f.raw.prepare('SELECT COUNT(*) n FROM homeflow_daily_task_events').get().n,beforeAudit)
  assert.equal(f.raw.prepare('SELECT completed FROM daily_task_completions WHERE task_id=?').get('bad-task').completed,7)
  f.raw.prepare('UPDATE daily_task_completions SET completed=0 WHERE task_id=?').run('bad-task')
  const recovered=await scopedDaily(f,ownerToken,'/legacy/adopt','POST',page)
  assert.equal(recovered.status,200,await recovered.clone().text())
  assert.equal((await recovered.json()).adopted,2)
  assert.equal((await scopedDaily(f,memberToken,'/legacy/adopt','POST',page)).status,403)
 }finally{f.raw.close()}
})


function scopedLanguage(f,cookie,path='',method='GET',data=null,origin=app){
 const headers={}
 if(cookie)headers.Cookie='__Host-study_hf='+cookie
 if(method==='POST'){headers.Origin=origin;headers['Content-Type']='application/json'}
 const typed=method==='POST'&&data&&f.homeflowActors?.get(cookie)
  ?{expected_user_id:f.homeflowActors.get(cookie),...data}:data
 return homeflowLanguage(new Request(app+'/api/homeflow-study/language'+path,{
  method,headers,body:method==='POST'?JSON.stringify(typed??{}):undefined
 }),f.env)
}

test('Stage E language mastery and grades stay independent between spouses',async()=>{
 const f=sqliteEnv()
 try{
  f.env.HOMEFLOW_STUDY_LANGUAGE_ENABLED='true'
  assert.equal((await scopedLanguage(f,'','/cards?lang=ja')).status,401)
  const {ownerToken,memberToken}=await linkedDailyPair(f)
  const legacyMastery=f.raw.prepare('SELECT * FROM language_card_progress ORDER BY card_id').all()
  const legacyReview=f.raw.prepare('SELECT * FROM language_card_reviews ORDER BY card_id').all()
  const before=await scopedLanguage(f,ownerToken,'/cards?lang=ja')
  assert.equal(before.status,200)
  assert.equal((await before.json()).items[0].mastered,false,
   'existing owner must explicitly adopt old progress')
  assert.equal((await scopedLanguage(f,memberToken,'/legacy/adopt','POST',
   {confirm:true,kind:'mastery'})).status,403)
  const adoptMaster=await scopedLanguage(f,ownerToken,'/legacy/adopt','POST',
   {confirm:true,kind:'mastery'})
  assert.equal(adoptMaster.status,200,await adoptMaster.clone().text())
  assert.equal((await adoptMaster.json()).adopted,2)
  const adoptReview=await scopedLanguage(f,ownerToken,'/legacy/adopt','POST',
   {confirm:true,kind:'reviews'})
  assert.equal(adoptReview.status,200,await adoptReview.clone().text())
  assert.equal((await adoptReview.json()).adopted,2)
  const afterOwner=(await (await scopedLanguage(f,ownerToken,'/cards?lang=ja')).json()).items
  assert.equal(afterOwner[0].mastered,true)
  assert.equal(afterOwner[0].review_count,3)
  assert.equal(afterOwner[0].last_grade,'hard')
  const afterMember=(await (await scopedLanguage(f,memberToken,'/cards?lang=ja')).json()).items
  assert.equal(afterMember[0].mastered,false)
  assert.equal(afterMember[0].review_count,0)
  assert.equal(afterMember[0].review_version,0)
  const master=await scopedLanguage(f,memberToken,'/mastery','POST',
   {card_id:'ja-sentence-001',mastered:true,version:0})
  assert.equal(master.status,200,await master.clone().text())
  assert.equal((await master.json()).version,1)
  const grade=await scopedLanguage(f,memberToken,'/review','POST',{
   card_id:'ja-sentence-001',grade:'remembered',version:0,request_id:'a'.repeat(32)})
  assert.equal(grade.status,200,await grade.clone().text())
  assert.equal((await grade.json()).review.review_count,1)
  const ownerStill=(await (await scopedLanguage(f,ownerToken,'/cards?lang=ja')).json()).items
  assert.equal(ownerStill[0].review_count,3)
  assert.equal(ownerStill[0].mastery_version,1)
  const memberNow=(await (await scopedLanguage(f,memberToken,'/cards?lang=ja')).json()).items
  assert.equal(memberNow[0].review_count,1)
  assert.equal(memberNow[0].mastered,true)
  assert.deepEqual(f.raw.prepare('SELECT * FROM language_card_progress ORDER BY card_id').all(),legacyMastery)
  assert.deepEqual(f.raw.prepare('SELECT * FROM language_card_reviews ORDER BY card_id').all(),legacyReview)
  assert.equal(f.raw.prepare('SELECT COUNT(*) n FROM homeflow_language_reviews WHERE homeflow_user_id=?').get(owner).n,2)
  assert.equal(f.raw.prepare('SELECT COUNT(*) n FROM homeflow_language_reviews WHERE homeflow_user_id=?').get(member).n,1)
  assert.equal(f.raw.prepare("SELECT actor_user_id FROM homeflow_language_events WHERE action='graded'").get().actor_user_id,member)
  assert.equal(f.raw.prepare("SELECT SUM(affected_count) n FROM homeflow_language_events WHERE action='legacy_mastery_adopted'").get().n,2)
  assert.throws(()=>f.raw.prepare('DELETE FROM homeflow_language_events').run(),/IMMUTABLE_LANGUAGE_AUDIT/)
  assert.throws(()=>f.raw.prepare('UPDATE homeflow_language_events SET affected_count=9').run(),/IMMUTABLE_LANGUAGE_AUDIT/)
  assert.throws(()=>f.raw.prepare('INSERT INTO homeflow_language_mastery(homeflow_user_id,card_id,mastered,updated_by_user_id) VALUES(?,?,?,?)')
   .run(owner,'ja-sentence-002',1,member),/LANGUAGE_OWNER_REQUIRED/)
  assert.throws(()=>f.raw.prepare('INSERT INTO homeflow_language_reviews(homeflow_user_id,card_id,last_result,last_grade,updated_by_user_id) VALUES(?,?,?,?,?)')
   .run(owner,'ja-sentence-002','again','hard',member),/LANGUAGE_OWNER_REQUIRED/)
  f.active.valid=false
  assert.equal((await scopedLanguage(f,memberToken,'/cards?lang=ja')).status,401,
   'revoking original HomeFlow session invalidates personal lessons')
 }finally{f.raw.close()}
})

test('Stage E language review grading is idempotent and CAS guards stale devices',async()=>{
 const f=sqliteEnv()
 try{
  f.env.HOMEFLOW_STUDY_LANGUAGE_ENABLED='true'
  const {memberToken,ownerToken}=await linkedDailyPair(f)
  const payload={card_id:'ja-sentence-002',grade:'remembered',
   version:0,request_id:'b'.repeat(32)}
  assert.equal((await scopedLanguage(f,memberToken,'/review','POST',payload,'https://evil.example')).status,403)
  assert.equal((await scopedLanguage(f,memberToken,'/review','POST',
   {...payload,actor_user_id:owner})).status,400)
  assert.equal((await scopedLanguage(f,memberToken,'/review','POST',
   {...payload,version:1.5})).status,400)
  assert.equal((await scopedLanguage(f,memberToken,'/review','POST',
   {...payload,request_id:'short'})).status,400)
  assert.equal((await scopedLanguage(f,memberToken,'/mastery','POST',
   {card_id:'ja-sentence-001',mastered:true,version:0,homeflow_user_id:owner})).status,400)
  assert.equal((await scopedLanguage(f,memberToken,'/mastery','POST',
   {card_id:'unknown',mastered:true,version:0})).status,404)
  const initial=await scopedLanguage(f,memberToken,'/review','POST',payload)
  assert.equal(initial.status,200,await initial.clone().text())
  const first=await initial.json()
  assert.equal(first.review.version,1)
  assert.equal(first.review.correct_streak,1)
  assert.equal(first.review.review_count,1)
  assert.equal(first.review.last_grade,'remembered')
  const tomorrow=new Date(first.review.next_review_at.replace(' ','T')+'Z').getTime()
  assert.ok(tomorrow>Date.now()+23*3600000)
  const same=await scopedLanguage(f,memberToken,'/review','POST',payload)
  assert.equal(same.status,200)
  assert.equal((await same.json()).replayed,true)
  assert.equal((await scopedLanguage(f,memberToken,'/review','POST',
   {...payload,grade:'again'})).status,409,'reusing same request id with another grade must reject')
  assert.equal((await scopedLanguage(f,memberToken,'/review','POST',
   {...payload,request_id:'c'.repeat(32)})).status,409,'stale version zero cannot re-grade')
  let count=f.raw.prepare("SELECT COUNT(*) n FROM homeflow_language_events WHERE actor_user_id=? AND action='graded'").get(member).n
  assert.equal(count,1)
  const hard=await scopedLanguage(f,memberToken,'/review','POST',
   {...payload,grade:'hard',version:1,request_id:'c'.repeat(32)})
  assert.equal(hard.status,200,await hard.clone().text())
  const latest=await hard.json()
  assert.equal(latest.review.version,2)
  assert.equal(latest.review.correct_streak,0)
  assert.equal(latest.review.last_result,'again','hard keeps legacy last_result compatible')
  assert.equal(latest.review.last_grade,'hard')
  const hardNext=new Date(latest.review.next_review_at.replace(' ','T')+'Z').getTime()
  assert.ok(hardNext>Date.now()+5*3600000&&hardNext<Date.now()+7*3600000)
  const replayAfter=await scopedLanguage(f,memberToken,'/review','POST',payload)
  assert.equal(replayAfter.status,200)
  assert.equal((await replayAfter.json()).replayed,true)
  assert.equal(f.raw.prepare("SELECT COUNT(*) n FROM homeflow_language_events WHERE actor_user_id=? AND action='graded'").get(member).n,2)
  const oneMaster={card_id:'ja-sentence-002',mastered:true,version:0}
  assert.equal((await scopedLanguage(f,memberToken,'/mastery','POST',oneMaster)).status,200)
  assert.equal((await (await scopedLanguage(f,memberToken,'/mastery','POST',oneMaster)).json()).replayed,true)
  const unmastered=await scopedLanguage(f,memberToken,'/mastery','POST',
   {...oneMaster,mastered:false,version:1})
  assert.equal(unmastered.status,200)
  assert.equal((await unmastered.json()).version,2)
  assert.equal((await scopedLanguage(f,memberToken,'/mastery','POST',
   {...oneMaster,version:1})).status,409)
  assert.equal(f.raw.prepare("SELECT COUNT(*) n FROM homeflow_language_events WHERE actor_user_id=? AND action IN ('mastered','unmastered')").get(member).n,2)
  const ownerReview=await scopedLanguage(f,ownerToken,'/review','POST',payload)
  assert.equal(ownerReview.status,200,'same client request id on another account is independent')
  assert.equal((await ownerReview.json()).review.review_count,1)
 }finally{f.raw.close()}
})

test('Stage E owner language adoption detects corrupt legacy rows before copying a page',async()=>{
 const f=sqliteEnv()
 try{
  f.env.HOMEFLOW_STUDY_LANGUAGE_ENABLED='true'
  const {ownerToken,memberToken}=await linkedDailyPair(f)
  const oldProgress=f.raw.prepare("SELECT * FROM language_card_progress ORDER BY card_id").all()
  f.raw.prepare('UPDATE language_card_progress SET mastered=7 WHERE card_id=?')
   .run('ja-sentence-001')
  const before=f.raw.prepare("SELECT * FROM language_card_progress ORDER BY card_id").all()
  const invalid=await scopedLanguage(f,ownerToken,'/legacy/adopt','POST',
   {confirm:true,kind:'mastery'})
  assert.equal(invalid.status,409)
  assert.equal((await invalid.json()).code,'LEGACY_LANGUAGE_REVIEW_REQUIRED')
  assert.equal(f.raw.prepare('SELECT COUNT(*) n FROM homeflow_language_mastery').get().n,0)
  assert.equal(f.raw.prepare('SELECT COUNT(*) n FROM homeflow_language_events').get().n,0)
  assert.deepEqual(f.raw.prepare('SELECT * FROM language_card_progress ORDER BY card_id').all(),before)
  f.raw.prepare('UPDATE language_card_progress SET mastered=1 WHERE card_id=?')
   .run('ja-sentence-001')
  const repaired=await scopedLanguage(f,ownerToken,'/legacy/adopt','POST',
   {confirm:true,kind:'mastery'})
  assert.equal(repaired.status,200,await repaired.clone().text())
  assert.equal((await repaired.json()).adopted,2)
  f.raw.prepare('UPDATE language_card_reviews SET last_grade=? WHERE card_id=?')
   .run('invalid-grade','ja-sentence-001')
  const r=await scopedLanguage(f,ownerToken,'/legacy/adopt','POST',
   {confirm:true,kind:'reviews'})
  assert.equal(r.status,409)
  assert.equal(f.raw.prepare('SELECT COUNT(*) n FROM homeflow_language_reviews').get().n,0)
  f.raw.prepare('UPDATE language_card_reviews SET last_grade=? WHERE card_id=?')
   .run('hard','ja-sentence-001')
  assert.equal((await scopedLanguage(f,ownerToken,'/legacy/adopt','POST',
   {confirm:true,kind:'reviews'})).status,200)
  assert.equal((await scopedLanguage(f,memberToken,'/legacy/adopt','POST',
   {confirm:true,kind:'reviews'})).status,403)
  assert.equal((await scopedLanguage(f,ownerToken,'/legacy/adopt','POST',
   {confirm:true,kind:'mastery',after:123})).status,400)
  assert.equal((await scopedLanguage(f,ownerToken,'/legacy/adopt','POST',
   {confirm:false,kind:'mastery'})).status,403)
  assert.equal((await scopedLanguage(f,ownerToken,'/legacy/adopt','POST',
   {confirm:true,kind:'mastery',limit:900})).status,403)
  assert.equal(f.raw.prepare('SELECT COUNT(*) n FROM homeflow_language_mastery').get().n,2)
  assert.equal(f.raw.prepare('SELECT COUNT(*) n FROM homeflow_language_reviews').get().n,2)
  assert.equal(f.raw.prepare('SELECT COUNT(*) n FROM homeflow_language_events WHERE action LIKE ?').get('legacy_%').n,2)
 }finally{f.raw.close()}
})

test('Stage E language catalogue and legacy import have bounded cursors, gated access',async()=>{
 const f=sqliteEnv()
 try{
  assert.equal((await scopedLanguage(f,'','/status').then(x=>x.json())).enabled,false)
  assert.equal((await scopedLanguage(f,'','/cards')).status,503)
  f.env.HOMEFLOW_STUDY_LANGUAGE_ENABLED='true'
  const {ownerToken,memberToken}=await linkedDailyPair(f)
  const addCard=f.raw.prepare('INSERT INTO language_cards(id,language,content_type,term) VALUES(?,?,?,?)')
  const addMaster=f.raw.prepare('INSERT INTO language_card_progress(card_id,mastered) VALUES(?,?)')
  for(let i=3;i<=26;i++){
   const id='ja-sentence-'+String(i).padStart(3,'0')
   addCard.run(id,'ja','sentence','日本語'+i)
   addMaster.run(id,i%2)
  }
  const first=await scopedLanguage(f,memberToken,'/cards?lang=ja&limit=5')
  assert.equal(first.status,200)
  const firstBody=await first.json()
  assert.equal(firstBody.items.length,5)
  assert.ok(firstBody.next_cursor)
  assert.equal(firstBody.items[0].mastery_version,0)
  assert.equal((await scopedLanguage(f,memberToken,'/cards?lang=ja&limit=5&after='+encodeURIComponent(firstBody.next_cursor))).status,200)
  assert.equal((await scopedLanguage(f,memberToken,'/cards?lang=ja&limit=100')).status,400)
  assert.equal((await scopedLanguage(f,memberToken,'/cards?lang=xx')).status,400)
  const p1=await scopedLanguage(f,ownerToken,'/legacy/adopt','POST',
   {confirm:true,kind:'mastery'})
  assert.equal(p1.status,200)
  const a1=await p1.json()
  assert.equal(a1.adopted,20)
  assert.equal(a1.has_more,true)
  const p2=await scopedLanguage(f,ownerToken,'/legacy/adopt','POST',
   {confirm:true,kind:'mastery',after:a1.next_cursor})
  assert.equal(p2.status,200)
  assert.equal((await p2.json()).adopted,6)
  assert.equal((await (await scopedLanguage(f,ownerToken,'/legacy/adopt','POST',
   {confirm:true,kind:'mastery',after:a1.next_cursor})).json()).adopted,0)
  assert.equal(f.raw.prepare('SELECT COUNT(*) n FROM homeflow_language_mastery WHERE homeflow_user_id=?').get(owner).n,26)
  assert.equal(f.raw.prepare('SELECT COUNT(*) n FROM homeflow_language_mastery WHERE homeflow_user_id=?').get(member).n,0)
  assert.equal((await scopedLanguage(f,memberToken,'/status').then(x=>x.json())).enabled,true)
  f.env.HOMEFLOW_STUDY_LANGUAGE_ENABLED='false'
  assert.equal((await scopedLanguage(f,memberToken,'/cards?lang=ja')).status,503)
  f.env.HOMEFLOW_STUDY_LANGUAGE_ENABLED='true'
  f.env.APP_ENV='preview'
  assert.equal((await scopedLanguage(f,memberToken,'/cards?lang=ja')).status,503)
 }finally{f.raw.close()}
})


function scopedExams(f,cookie,path='',method='GET',data=null,origin=app){
 const headers={}
 if(cookie)headers.Cookie='__Host-study_hf='+cookie
 if(method==='POST'){
  headers.Origin=origin
  headers['Content-Type']='application/json'
 }
 const typed=method==='POST'&&data&&f.homeflowActors?.get(cookie)
  ?{expected_user_id:f.homeflowActors.get(cookie),...data}:data
 return homeflowExams(new Request(app+'/api/homeflow-study/exams'+path,{
  method,headers,body:method==='POST'?JSON.stringify(typed??{}):undefined
 }),f.env)
}
test('Stage E exams isolate practice, wrong answers and manual history between spouses',async()=>{
 const f=sqliteEnv()
 try{
  f.env.HOMEFLOW_STUDY_EXAMS_ENABLED='true'
  assert.equal((await scopedExams(f,'','/questions')).status,401)
  const {ownerToken,memberToken}=await linkedDailyPair(f)
  const originalAttempts=f.raw.prepare('SELECT * FROM study_attempts').all()
  const originalReviews=f.raw.prepare('SELECT * FROM question_review_state').all()
  const originalHistory=f.raw.prepare('SELECT * FROM exam_history').all()
  const qs=await scopedExams(f,memberToken,'/questions?track=exam-sg')
  assert.equal(qs.status,200,await qs.clone().text())
  const publicCards=(await qs.json()).items
  assert.equal(publicCards.length,15,'practice cards use the existing bounded page size')
  assert.ok(publicCards.some(q=>q.id==='sg-example-001'))
  assert.ok(!Object.keys(publicCards[0]).includes('answer'),
   'practice question must never include the answer before grading')
  assert.equal(publicCards[0].wrong_count,0,
   'member never inherits owner old wrong answers')
  const save=await scopedExams(f,memberToken,'/attempts','POST',{
   attempt_id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
   question_id:'sg-example-001',answer:'a',duration_seconds:21})
  assert.equal(save.status,201,await save.clone().text())
  const result=await save.json()
  assert.equal(result.correct,false)
  assert.equal(result.answer,'b')
  assert.equal(result.progress.review_count,1)
  const memberWrong=await scopedExams(f,memberToken,'/wrong?track=exam-sg')
  assert.equal(memberWrong.status,200)
  assert.deepEqual((await memberWrong.json()).items.map(q=>[q.id,q.wrong_count]),
   [['sg-example-001',1]])
  assert.equal((await (await scopedExams(f,ownerToken,'/wrong?track=exam-sg')).json()).items.length,0,
   'owner must explicitly adopt historical wrong answers')
  const ownerAdopt=await scopedExams(f,ownerToken,'/legacy/adopt','POST',
   {confirm:true,kind:'attempts'})
  assert.equal(ownerAdopt.status,200,await ownerAdopt.clone().text())
  assert.equal((await ownerAdopt.json()).adopted,1)
  assert.equal((await (await scopedExams(f,ownerToken,'/wrong?track=exam-sg')).json()).items.length,1)
  assert.equal((await (await scopedExams(f,memberToken,'/wrong?track=exam-fe')).json()).items.length,0)
  assert.deepEqual(f.raw.prepare('SELECT * FROM study_attempts').all(),originalAttempts)
  assert.deepEqual(f.raw.prepare('SELECT * FROM question_review_state').all(),originalReviews)
  assert.deepEqual(f.raw.prepare('SELECT * FROM exam_history').all(),originalHistory)
  assert.equal(f.raw.prepare('SELECT COUNT(*) n FROM homeflow_study_attempts WHERE homeflow_user_id=?').get(owner).n,1)
  assert.equal(f.raw.prepare('SELECT COUNT(*) n FROM homeflow_study_attempts WHERE homeflow_user_id=?').get(member).n,1)
  assert.equal(f.raw.prepare("SELECT actor_user_id FROM homeflow_exam_events WHERE action='attempt'").get().actor_user_id,member)
  assert.equal((await scopedExams(f,memberToken,'/legacy/adopt','POST',
   {confirm:true,kind:'attempts'})).status,403)
  f.active.valid=false
  assert.equal((await scopedExams(f,memberToken,'/wrong')).status,401,
   'HomeFlow session revocation blocks all private question data')
 }finally{f.raw.close()}
})

test('Stage E practice answer idempotency protects scores, review streaks and actor audit',async()=>{
 const f=sqliteEnv()
 try{
  f.env.HOMEFLOW_STUDY_EXAMS_ENABLED='true'
  const {ownerToken,memberToken}=await linkedDailyPair(f)
  const answer={attempt_id:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
   question_id:'sg-example-002',answer:'b',duration_seconds:8}
  assert.equal((await scopedExams(f,memberToken,'/attempts','POST',answer,'https://bad.example')).status,403)
  assert.equal((await scopedExams(f,memberToken,'/attempts','POST',{...answer,actor_user_id:owner})).status,400)
  assert.equal((await scopedExams(f,memberToken,'/attempts','POST',{...answer,duration_seconds:-1})).status,400)
  assert.equal((await scopedExams(f,memberToken,'/attempts','POST',{...answer,question_id:'missing'})).status,404)
  const save=await scopedExams(f,memberToken,'/attempts','POST',answer)
  assert.equal(save.status,201,await save.clone().text())
  assert.equal((await save.json()).progress.correct_streak,1)
  assert.equal((await (await scopedExams(f,memberToken,'/attempts','POST',answer)).json()).replayed,true)
  assert.equal((await scopedExams(f,memberToken,'/attempts','POST',{...answer,answer:'a'})).status,409)
  assert.equal(f.raw.prepare("SELECT COUNT(*) n FROM homeflow_exam_events WHERE actor_user_id=? AND action='attempt'").get(member).n,1)
  assert.equal(f.raw.prepare('SELECT review_count FROM homeflow_question_review_state WHERE homeflow_user_id=? AND question_id=?')
   .get(member,'sg-example-002').review_count,1)
  const ownerSame=await scopedExams(f,ownerToken,'/attempts','POST',answer)
  assert.equal(ownerSame.status,201,'one attempt_id is safe across separate owner partitions')
  const second=await scopedExams(f,memberToken,'/attempts','POST',
   {...answer,attempt_id:'cccccccc-cccc-4ccc-8ccc-cccccccccccc'})
  assert.equal(second.status,201)
  const third=await scopedExams(f,memberToken,'/attempts','POST',
   {...answer,attempt_id:'dddddddd-dddd-4ddd-8ddd-dddddddddddd'})
  assert.equal(third.status,201)
  const row=f.raw.prepare('SELECT review_count,correct_streak,mastered FROM homeflow_question_review_state WHERE homeflow_user_id=? AND question_id=?')
   .get(member,'sg-example-002')
  assert.deepEqual([row.review_count,row.correct_streak,row.mastered],[3,3,1])
  const ownerRow=f.raw.prepare('SELECT review_count,correct_streak,mastered FROM homeflow_question_review_state WHERE homeflow_user_id=? AND question_id=?')
   .get(owner,'sg-example-002')
  assert.deepEqual([ownerRow.review_count,ownerRow.correct_streak,ownerRow.mastered],[1,1,0])
  assert.throws(()=>f.raw.prepare('DELETE FROM homeflow_exam_events').run(),/IMMUTABLE_EXAM_AUDIT/)
  assert.throws(()=>f.raw.prepare('UPDATE homeflow_exam_events SET affected_count=4').run(),/IMMUTABLE_EXAM_AUDIT/)
 }finally{f.raw.close()}
})

test('Stage E exam history stays personal, immutable on conflicting ID and retains both old and new receipts',async()=>{
 const f=sqliteEnv()
 try{
  f.env.HOMEFLOW_STUDY_EXAMS_ENABLED='true'
  const {ownerToken,memberToken}=await linkedDailyPair(f)
  assert.deepEqual((await (await scopedExams(f,memberToken,'/history')).json()).items,[])
  assert.deepEqual((await (await scopedExams(f,ownerToken,'/history')).json()).items,[])
  const ownerOld=await scopedExams(f,ownerToken,'/legacy/adopt','POST',
   {confirm:true,kind:'history'})
  assert.equal(ownerOld.status,200,await ownerOld.clone().text())
  assert.equal((await ownerOld.json()).adopted,1)
  assert.equal((await (await scopedExams(f,memberToken,'/history')).json()).items.length,0)
  const entry={id:'exam-score-0000001',date:'2026-11-13',exam:'SG 模拟练习',
   total:60,correct:50}
  const saved=await scopedExams(f,memberToken,'/history','POST',entry)
  assert.equal(saved.status,201,await saved.clone().text())
  assert.equal((await saved.json()).replayed,false)
  assert.equal((await (await scopedExams(f,memberToken,'/history','POST',entry)).json()).replayed,true)
  assert.equal((await scopedExams(f,memberToken,'/history','POST',
   {...entry,correct:42})).status,409)
  assert.equal((await scopedExams(f,memberToken,'/history','POST',
   {...entry,date:'2026-02-30'})).status,400)
  const memberHistory=(await (await scopedExams(f,memberToken,'/history')).json()).items
  assert.equal(memberHistory.length,1)
  assert.equal(memberHistory[0].correct,50)
  const ownerHistory=(await (await scopedExams(f,ownerToken,'/history')).json()).items
  assert.equal(ownerHistory.length,1)
  assert.equal(ownerHistory[0].id,'legacy-history-001')
  assert.equal(f.raw.prepare("SELECT COUNT(*) n FROM homeflow_exam_events WHERE actor_user_id=? AND action='history_added'").get(member).n,1)
  assert.equal(f.raw.prepare('SELECT COUNT(*) n FROM exam_history').get().n,1)
 }finally{f.raw.close()}
})

test('Stage E owner exam adoption refuses damaged source pages without partial writes',async()=>{
 const f=sqliteEnv()
 try{
  f.env.HOMEFLOW_STUDY_EXAMS_ENABLED='true'
  const {ownerToken,memberToken}=await linkedDailyPair(f)
  f.raw.prepare('UPDATE study_attempts SET user_answer_json=? WHERE id=?')
   .run('not-json','legacy-attempt-0001')
  const bad=await scopedExams(f,ownerToken,'/legacy/adopt','POST',
   {confirm:true,kind:'attempts'})
  assert.equal(bad.status,409)
  assert.equal((await bad.json()).code,'LEGACY_EXAM_REVIEW_REQUIRED')
  assert.equal(f.raw.prepare('SELECT COUNT(*) n FROM homeflow_study_attempts').get().n,0)
  assert.equal(f.raw.prepare('SELECT COUNT(*) n FROM homeflow_exam_events').get().n,0)
  assert.equal(f.raw.prepare('SELECT user_answer_json FROM study_attempts').get().user_answer_json,'not-json')
  f.raw.prepare('UPDATE study_attempts SET user_answer_json=?').run('"a"')
  const repair=await scopedExams(f,ownerToken,'/legacy/adopt','POST',
   {confirm:true,kind:'attempts'})
  assert.equal(repair.status,200,await repair.clone().text())
  assert.equal((await repair.json()).adopted,1)
  f.raw.prepare('UPDATE question_review_state SET correct_streak=-2').run()
  const reviews=await scopedExams(f,ownerToken,'/legacy/adopt','POST',
   {confirm:true,kind:'reviews'})
  assert.equal(reviews.status,409)
  assert.equal(f.raw.prepare('SELECT COUNT(*) n FROM homeflow_question_review_state').get().n,0)
  f.raw.prepare('UPDATE question_review_state SET correct_streak=0').run()
  const goodReview=await scopedExams(f,ownerToken,'/legacy/adopt','POST',
   {confirm:true,kind:'reviews'})
  assert.equal(goodReview.status,200,await goodReview.clone().text())
  assert.equal((await goodReview.json()).adopted,1)
  assert.equal((await scopedExams(f,memberToken,'/legacy/adopt','POST',
   {confirm:true,kind:'reviews'})).status,403)
  assert.equal((await scopedExams(f,ownerToken,'/legacy/adopt','POST',
   {confirm:true,kind:'history',after:42})).status,400)
  assert.equal((await scopedExams(f,ownerToken,'/legacy/adopt','POST',
   {confirm:false,kind:'history'})).status,403)
  assert.equal((await scopedExams(f,memberToken,'/questions?track=exam-ap')).status,400)
  assert.equal((await scopedExams(f,memberToken,'/wrong?limit=100')).status,400)
  f.env.HOMEFLOW_STUDY_EXAMS_ENABLED='false'
  assert.equal((await scopedExams(f,ownerToken,'/wrong')).status,503)
  f.env.HOMEFLOW_STUDY_EXAMS_ENABLED='true';f.env.APP_ENV='preview'
  assert.equal((await scopedExams(f,memberToken,'/history')).status,503)
 }finally{f.raw.close()}
})


function scopedMock(f,cookie,path='',method='GET',data=null,origin=app){
 const headers={}
 if(cookie)headers.Cookie='__Host-study_hf='+cookie
 if(method==='POST'){headers.Origin=origin;headers['Content-Type']='application/json'}
 return homeflowMockExam(new Request(app+'/api/homeflow-study/exams/mock'+path,{
  method,headers,body:method==='POST'?JSON.stringify(data??{}):undefined
 }),f.env)
}
test('Stage E SG FE personal mock exams preserve graded receipts and never reveal answers before submit',async()=>{
 const f=sqliteEnv()
 try{
  assert.equal((await scopedMock(f,'','/status').then(x=>x.json())).enabled,false)
  assert.equal((await scopedMock(f,'','/questions')).status,503)
  f.env.HOMEFLOW_STUDY_EXAMS_ENABLED='true'
  f.env.HOMEFLOW_STUDY_MOCK_ENABLED='true'
  const {ownerToken,memberToken}=await linkedDailyPair(f)
  const sg=await scopedMock(f,memberToken,'/questions?track=exam-sg&section=SG')
  assert.equal(sg.status,200,await sg.clone().text())
  const sgPaper=await sg.json()
  assert.equal(sgPaper.total,60)
  assert.equal(sgPaper.section,'SG')
  assert.equal(sgPaper.items.length,60)
  assert.equal(sgPaper.items.filter(q=>q.exam_section==='A').length,48)
  assert.equal(sgPaper.items.filter(q=>q.exam_section==='B').length,12)
  assert.ok(!sgPaper.items.some(q=>'answer' in q||'answer_json' in q||'explanation' in q),
   'the test paper must never leak answer keys')
  const answers=sgPaper.items.map((q,i)=>({question_id:q.id,answer:i===0?'a':'b'}))
  const post={submission_id:'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
   track:'exam-sg',section:'SG',study_date:'2026-11-13',duration_seconds:7200,
   expected_user_id:member,answers}
  assert.equal((await scopedMock(f,memberToken,'/submit','POST',
   {...post,expected_user_id:owner})).status,403,
   'a queued exam from another account must not post under this member')
  assert.equal((await scopedMock(f,ownerToken,'/submit','POST',post)).status,403,
   'a member exam cannot be replayed under an owner session')
  assert.equal(f.raw.prepare('SELECT COUNT(*) n FROM homeflow_mock_exam_submissions').get().n,0)
  const saved=await scopedMock(f,memberToken,'/submit','POST',post)
  assert.equal(saved.status,201,await saved.clone().text())
  const grade=await saved.json()
  assert.equal(grade.correct_count,59)
  assert.equal(grade.total,60)
  assert.equal(grade.review.length,60)
  assert.ok(grade.review[0].answer)
  const repeated=await scopedMock(f,memberToken,'/submit','POST',post)
  assert.equal(repeated.status,200)
  assert.deepEqual(await repeated.json(),grade)
  assert.equal((await scopedMock(f,memberToken,'/submit','POST',
   {...post,answers:answers.map(q=>({...q,answer:'b'}))})).status,409)
  const attempts=f.raw.prepare('SELECT COUNT(*) n FROM homeflow_study_attempts WHERE homeflow_user_id=?').get(member).n
  assert.equal(attempts,60)
  assert.equal(f.raw.prepare('SELECT SUM(review_count) n FROM homeflow_question_review_state WHERE homeflow_user_id=?').get(member).n,60)
  assert.equal(f.raw.prepare('SELECT COUNT(*) n FROM homeflow_exam_history WHERE homeflow_user_id=?').get(member).n,1)
  assert.equal(f.raw.prepare("SELECT COUNT(*) n FROM homeflow_exam_events WHERE actor_user_id=? AND action='mock_submitted'").get(member).n,1)
  assert.equal(f.raw.prepare('SELECT COUNT(*) n FROM homeflow_mock_exam_submissions WHERE homeflow_user_id=?').get(owner).n,0)
  const ownerSame=await scopedMock(f,ownerToken,'/submit','POST',
   {...post,expected_user_id:owner})
  assert.equal(ownerSame.status,201,'same id across independent HomeFlow users is allowed')
  assert.equal(f.raw.prepare('SELECT COUNT(*) n FROM homeflow_mock_exam_submissions').get().n,2)
  assert.equal(f.raw.prepare('SELECT COUNT(*) n FROM study_attempts').get().n,1,
   'legacy study attempts unchanged')
  assert.equal(f.raw.prepare('SELECT COUNT(*) n FROM exam_history').get().n,1,
   'legacy exam history unchanged')
  assert.throws(()=>f.raw.prepare('DELETE FROM homeflow_mock_exam_submissions').run(),/IMMUTABLE_MOCK_RECEIPT/)
  assert.throws(()=>f.raw.prepare('UPDATE homeflow_mock_exam_submissions SET study_date=?').run('2026-11-14'),/IMMUTABLE_MOCK_RECEIPT/)
 }finally{f.raw.close()}
})

test('Stage E FE mock A and B require exact question distributions and preserve private scores',async()=>{
 const f=sqliteEnv()
 try{
  f.env.HOMEFLOW_STUDY_EXAMS_ENABLED='true'
  f.env.HOMEFLOW_STUDY_MOCK_ENABLED='true'
  const {ownerToken,memberToken}=await linkedDailyPair(f)
  assert.equal((await scopedMock(f,memberToken,'/questions?track=exam-ap&section=SG')).status,400)
  assert.equal((await scopedMock(f,memberToken,'/questions?track=exam-fe&section=SG')).status,400)
  const a=await scopedMock(f,memberToken,'/questions?track=exam-fe&section=A')
  assert.equal(a.status,200,await a.clone().text())
  const paperA=await a.json()
  assert.equal(paperA.items.length,60)
  assert.ok(paperA.items.every(q=>q.exam_section==='A'))
  const b=await scopedMock(f,memberToken,'/questions?track=exam-fe&section=B')
  assert.equal(b.status,200,await b.clone().text())
  const paperB=await b.json()
  assert.equal(paperB.total,20)
  assert.equal(paperB.items.filter(q=>q.topic==='FE算法与程序设计').length,16)
  assert.equal(paperB.items.filter(q=>q.topic==='FE信息安全').length,4)
  const bAnswers=paperB.items.map(q=>({question_id:q.id,answer:'b'}))
  const payload={submission_id:'ffffffff-ffff-4fff-8fff-ffffffffffff',
   track:'exam-fe',section:'B',study_date:'2026-11-13',
   duration_seconds:4800,expected_user_id:member,answers:bAnswers}
  assert.equal((await scopedMock(f,memberToken,'/submit','POST',payload,'https://evil.example')).status,403)
  assert.equal((await scopedMock(f,memberToken,'/submit','POST',{...payload,actor_user_id:owner})).status,400)
  assert.equal((await scopedMock(f,memberToken,'/submit','POST',{...payload,study_date:'2026-02-30'})).status,400)
  assert.equal((await scopedMock(f,memberToken,'/submit','POST',
   {...payload,answers:bAnswers.slice(0,19)})).status,400)
  assert.equal((await scopedMock(f,memberToken,'/submit','POST',
   {...payload,answers:bAnswers.map((q,i)=>i===19?bAnswers[0]:q)})).status,400)
  assert.equal((await scopedMock(f,memberToken,'/submit','POST',
   {...payload,answers:paperA.items.slice(0,20).map(q=>({question_id:q.id,answer:'b'}))})).status,409,
   'wrong FE B distribution must not be scored as valid')
  const done=await scopedMock(f,memberToken,'/submit','POST',payload)
  assert.equal(done.status,201,await done.clone().text())
  assert.equal((await done.json()).correct_count,20)
  assert.equal((await (await scopedExams(f,memberToken,'/history')).json()).items[0].correct,20)
  assert.equal((await (await scopedExams(f,ownerToken,'/history')).json()).items.length,0)
  f.active.valid=false
  assert.equal((await scopedMock(f,memberToken,'/submit','POST',payload)).status,401)
  f.active.valid=true
  f.env.HOMEFLOW_STUDY_MOCK_ENABLED='false'
  assert.equal((await scopedMock(f,memberToken,'/questions?track=exam-fe&section=A')).status,503)
 }finally{f.raw.close()}
})


test('long legacy mock receipt-derived attempt ids remain lossless under owner adoption',async()=>{
 const f=sqliteEnv()
 try{
  f.env.HOMEFLOW_STUDY_EXAMS_ENABLED='true'
  const {ownerToken,memberToken}=await linkedDailyPair(f)
  const longId='12345678-1234-4123-8123-123456789abc:'+ 'q'.repeat(111)
  assert.ok(longId.length>120&&longId.length<240)
  f.raw.prepare('INSERT INTO study_attempts(id,question_id,user_answer_json,is_correct,duration_seconds) VALUES(?,?,?,?,?)')
   .run(longId,'sg-example-001','"b"',1,14)
  const old=f.raw.prepare('SELECT * FROM study_attempts ORDER BY id').all()
  const migrated=await scopedExams(f,ownerToken,'/legacy/adopt','POST',
   {confirm:true,kind:'attempts'})
  assert.equal(migrated.status,200,await migrated.clone().text())
  assert.equal((await migrated.json()).adopted,2)
  assert.equal(f.raw.prepare('SELECT COUNT(*) n FROM homeflow_study_attempts WHERE homeflow_user_id=? AND id=?')
   .get(owner,longId).n,1)
  assert.equal(f.raw.prepare('SELECT COUNT(*) n FROM homeflow_study_attempts WHERE homeflow_user_id=?')
   .get(member).n,0)
  assert.deepEqual(f.raw.prepare('SELECT * FROM study_attempts ORDER BY id').all(),old)
 }finally{f.raw.close()}
})


function scopedReceipts(f,cookie,path='',method='GET',data=null,origin=app){
 const headers={}
 if(cookie)headers.Cookie='__Host-study_hf='+cookie
 if(method==='POST'){headers.Origin=origin;headers['Content-Type']='application/json'}
 return homeflowMockReceipts(new Request(app+'/api/homeflow-study/exams/mock'+path,{
  method,headers,body:method==='POST'?JSON.stringify(data??{}):undefined
 }),f.env)
}
function legacyMockFixture(f,i){
 const receiptId=String(i).padStart(8,'0')+'-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
 const ids=[...Array.from({length:48},(_,n)=>'sg-mock-a-'+String(n+1).padStart(3,'0')),
  ...Array.from({length:12},(_,n)=>'sg-mock-b-'+String(n+1).padStart(3,'0'))]
 const answers=ids.map((id,n)=>({question_id:id,answer:n===0?'a':'b'}))
 const payload=JSON.stringify({track:'exam-sg',section:'SG',date:'2026-11-11',
  duration:3000+i,answers})
 const review=ids.map(id=>({id,answer:'b',explanation:'原复习解析 '+id}))
 const result=JSON.stringify({ok:true,submission_id:receiptId,track:'exam-sg',
  section:'SG',correct_count:59,total:60,exam_name:'SG 模擬試験',
  study_date:'2026-11-11',review})
 f.raw.prepare('INSERT INTO mock_exam_submissions(id,track_id,exam_section,payload_json,result_json) VALUES(?,?,?,?,?)')
  .run(receiptId,'exam-sg','SG',payload,result)
 return {id:receiptId,payload,result,answers}
}

test('Stage E original mock receipt adoption copies raw bytes only to the proved owner',async()=>{
 const f=sqliteEnv()
 try{
  f.env.HOMEFLOW_STUDY_EXAMS_ENABLED='true'
  f.env.HOMEFLOW_STUDY_MOCK_ENABLED='true'
  const old=Array.from({length:6},(_,i)=>legacyMockFixture(f,i+1))
  const original=f.raw.prepare('SELECT * FROM mock_exam_submissions ORDER BY id').all()
  const {ownerToken,memberToken}=await linkedDailyPair(f)
  assert.equal((await scopedReceipts(f,'','/receipts')).status,401)
  assert.deepEqual((await (await scopedReceipts(f,ownerToken,'/receipts')).json()).items,[])
  assert.deepEqual((await (await scopedReceipts(f,memberToken,'/receipts')).json()).items,[])
  assert.equal((await scopedReceipts(f,memberToken,'/legacy/adopt','POST',{confirm:true})).status,403)
  assert.equal((await scopedReceipts(f,ownerToken,'/legacy/adopt','POST',
   {confirm:true},'https://evil.test')).status,403)
  assert.equal((await scopedReceipts(f,ownerToken,'/legacy/adopt','POST',{confirm:false})).status,403)
  const first=await scopedReceipts(f,ownerToken,'/legacy/adopt','POST',{confirm:true})
  assert.equal(first.status,200,await first.clone().text())
  const page=await first.json()
  assert.equal(page.adopted,5)
  assert.equal(page.has_more,true)
  assert.equal(page.next_cursor,old[4].id)
  assert.equal(page.legacy_changed,false)
  assert.equal(f.raw.prepare('SELECT COUNT(*) n FROM homeflow_mock_legacy_adoptions WHERE actor_user_id=?').get(owner).n,5)
  const replay=await scopedReceipts(f,ownerToken,'/legacy/adopt','POST',{confirm:true})
  assert.equal(replay.status,200,await replay.clone().text())
  assert.equal((await replay.json()).skipped_identical,5)
  assert.equal(f.raw.prepare('SELECT COUNT(*) n FROM homeflow_mock_legacy_adoptions').get().n,5)
  const second=await scopedReceipts(f,ownerToken,'/legacy/adopt','POST',
   {confirm:true,after:page.next_cursor})
  assert.equal(second.status,200,await second.clone().text())
  assert.equal((await second.json()).adopted,1)
  assert.equal((await (await scopedReceipts(f,ownerToken,'/legacy/adopt','POST',
   {confirm:true,after:page.next_cursor})).json()).adopted,0)
  const list=await scopedReceipts(f,ownerToken,'/receipts?limit=3')
  assert.equal(list.status,200)
  const listed=await list.json()
  assert.equal(listed.items.length,3)
  assert.equal(listed.items[0].correct,59)
  assert.equal(listed.items[0].legacy_imported,true)
  assert.equal((await (await scopedReceipts(f,ownerToken,
   '/receipts?limit=3&after='+listed.next_cursor)).json()).items.length,3)
  assert.deepEqual((await (await scopedReceipts(f,memberToken,'/receipts')).json()).items,[])
  assert.equal((await scopedReceipts(f,memberToken,
   '/receipt?id='+old[0].id)).status,404)
  const view=await scopedReceipts(f,ownerToken,'/receipt?id='+old[0].id)
  assert.equal(view.status,200,await view.clone().text())
  const details=await view.json()
  assert.equal(details.scope,'user')
  assert.equal(details.legacy_imported,true)
  assert.equal(details.result.review.length,60)
  assert.equal(details.result.correct_count,59)
  assert.equal(details.result.scope,'user')
  const target=f.raw.prepare('SELECT * FROM homeflow_mock_exam_submissions WHERE homeflow_user_id=? AND id=?')
   .get(owner,old[0].id)
  assert.equal(target.payload_json,old[0].payload,'retain source payload byte-for-byte')
  assert.equal(target.result_json,old[0].result,'retain source result byte-for-byte')
  assert.deepEqual(f.raw.prepare('SELECT * FROM mock_exam_submissions ORDER BY id').all(),original)
  assert.equal(f.raw.prepare('SELECT COUNT(*) n FROM homeflow_mock_exam_submissions WHERE homeflow_user_id=?').get(member).n,0)
  const audit=f.raw.prepare('SELECT * FROM homeflow_mock_legacy_adoptions WHERE actor_user_id=? ORDER BY original_submission_id').all(owner)
  assert.equal(audit.length,6)
  assert.ok(audit.every(x=>x.payload_sha256.length===64&&x.result_sha256.length===64))
  assert.throws(()=>f.raw.prepare('UPDATE homeflow_mock_legacy_adoptions SET original_submission_id=?').run(old[0].id),/IMMUTABLE_MOCK_ADOPTION_AUDIT/)
  assert.throws(()=>f.raw.prepare('DELETE FROM homeflow_mock_legacy_adoptions').run(),/IMMUTABLE_MOCK_ADOPTION_AUDIT/)
  const retried=await scopedMock(f,ownerToken,'/submit','POST',{
   submission_id:old[0].id,track:'exam-sg',section:'SG',
   study_date:'2026-11-11',duration_seconds:3001,
    expected_user_id:owner,answers:old[0].answers})
  assert.equal(retried.status,200,await retried.clone().text())
  assert.equal((await retried.json()).scope,'user',
   'legacy receipt replay receives new scoped envelope without modifying old bytes')
  assert.equal(f.raw.prepare('SELECT COUNT(*) n FROM homeflow_study_attempts WHERE homeflow_user_id=?').get(owner).n,0,
   'receipts never regrade or duplicate separately adopted attempts')
 }finally{f.raw.close()}
})

test('Stage E malformed old mock receipt blocks entire adoption page and never advances cursor',async()=>{
 const f=sqliteEnv()
 try{
  f.env.HOMEFLOW_STUDY_EXAMS_ENABLED='true'
  f.env.HOMEFLOW_STUDY_MOCK_ENABLED='true'
  const r1=legacyMockFixture(f,1)
  const r2=legacyMockFixture(f,2)
  const {ownerToken,memberToken}=await linkedDailyPair(f)
  const corrupted=JSON.parse(r2.result)
  corrupted.correct_count=60
  f.raw.prepare('UPDATE mock_exam_submissions SET result_json=? WHERE id=?')
   .run(JSON.stringify(corrupted),r2.id)
  const original=f.raw.prepare('SELECT * FROM mock_exam_submissions ORDER BY id').all()
  const fail=await scopedReceipts(f,ownerToken,'/legacy/adopt','POST',{confirm:true})
  assert.equal(fail.status,409,await fail.clone().text())
  assert.equal((await fail.json()).code,'LEGACY_MOCK_RECEIPT_REVIEW_REQUIRED')
  assert.equal(f.raw.prepare('SELECT COUNT(*) n FROM homeflow_mock_exam_submissions').get().n,0)
  assert.equal(f.raw.prepare('SELECT COUNT(*) n FROM homeflow_mock_legacy_adoptions').get().n,0)
  assert.deepEqual(f.raw.prepare('SELECT * FROM mock_exam_submissions ORDER BY id').all(),original)
  f.raw.prepare('UPDATE mock_exam_submissions SET result_json=? WHERE id=?')
   .run(r2.result,r2.id)
  const fixed=await scopedReceipts(f,ownerToken,'/legacy/adopt','POST',{confirm:true})
  assert.equal(fixed.status,200,await fixed.clone().text())
  assert.equal((await fixed.json()).adopted,2)
  assert.equal((await scopedReceipts(f,memberToken,'/receipt?id='+r1.id)).status,404)
  assert.equal((await scopedReceipts(f,ownerToken,'/receipts?limit=999')).status,400)
  assert.equal((await scopedReceipts(f,ownerToken,'/receipt?id=../../private')).status,400)
  assert.equal((await scopedReceipts(f,ownerToken,'/legacy/adopt','POST',{confirm:true,after:'bad'})).status,400)
  assert.equal((await scopedReceipts(f,ownerToken,'/legacy/adopt','POST',{confirm:true,actor_user_id:member})).status,403)
  f.active.valid=false
  assert.equal((await scopedReceipts(f,ownerToken,'/receipts')).status,401)
  f.active.valid=true
  f.env.HOMEFLOW_STUDY_MOCK_ENABLED='false'
  assert.equal((await scopedReceipts(f,ownerToken,'/receipts')).status,503)
 }finally{f.raw.close()}
})

test('Stage E conflicting existing personal receipt fails closed and preserves immutable data',async()=>{
 const f=sqliteEnv()
 try{
  f.env.HOMEFLOW_STUDY_EXAMS_ENABLED='true'
  f.env.HOMEFLOW_STUDY_MOCK_ENABLED='true'
  const old=legacyMockFixture(f,1)
  const {ownerToken,memberToken}=await linkedDailyPair(f)
  const existingResult=JSON.stringify({ok:true,scope:'user',total:60,correct_count:59})
  f.raw.prepare('INSERT INTO homeflow_mock_exam_submissions '+
   '(homeflow_user_id,id,track_id,exam_section,study_date,payload_json,result_json,created_at) '+
   'VALUES(?,?,?,?,?,?,?,CURRENT_TIMESTAMP)')
   .run(owner,old.id,'exam-sg','SG','2026-11-11',old.payload,existingResult)
  const before=f.raw.prepare('SELECT * FROM homeflow_mock_exam_submissions').all()
  const out=await scopedReceipts(f,ownerToken,'/legacy/adopt','POST',{confirm:true})
  assert.equal(out.status,409)
  assert.equal((await out.json()).code,'MOCK_RECEIPT_CONFLICT')
  assert.deepEqual(f.raw.prepare('SELECT * FROM homeflow_mock_exam_submissions').all(),before)
  assert.equal(f.raw.prepare('SELECT COUNT(*) n FROM homeflow_mock_legacy_adoptions').get().n,0)
  assert.equal((await (await scopedReceipts(f,memberToken,'/receipts')).json()).items.length,0)
 }finally{f.raw.close()}
})

function scopedGrammar(f,cookie,path='',method='GET',data=null,origin=app){
 const headers={}
 if(cookie)headers.Cookie='__Host-study_hf='+cookie
 if(method==='POST'){headers.Origin=origin;headers['Content-Type']='application/json'}
 return homeflowGrammar(new Request(app+'/api/homeflow-study/grammar'+path,{
  method,headers,body:method==='POST'?JSON.stringify(data??{}):undefined
 }),f.env)
}
test('HomeFlow grammar answers separate owner and member, first answer wins, legacy owner alone may adopt',async()=>{
 const f=sqliteEnv()
 try{
  const {ownerToken,memberToken}=await linkedDailyPair(f)
  const day='?date=2026-11-13&language=ja'
  assert.equal((await scopedGrammar(f,ownerToken,day)).status,503,'feature default OFF')
  f.env.HOMEFLOW_STUDY_GRAMMAR_ENABLED='true'
  assert.equal((await scopedGrammar(f,'',day)).status,401)
  assert.deepEqual((await (await scopedGrammar(f,ownerToken,day)).json()).items,[])
  assert.deepEqual((await (await scopedGrammar(f,memberToken,day)).json()).items,[])
  const old=f.raw.prepare('SELECT * FROM daily_grammar_answers').all()
  assert.equal((await scopedGrammar(f,memberToken,'/legacy/adopt','POST',{confirm:true})).status,403)
  const migration=await scopedGrammar(f,ownerToken,'/legacy/adopt','POST',{confirm:true})
  assert.equal(migration.status,200,await migration.clone().text())
  assert.equal((await migration.json()).adopted,1)
  assert.equal((await (await scopedGrammar(f,ownerToken,'/legacy/adopt','POST',{confirm:true})).json()).adopted,0)
  assert.equal((await (await scopedGrammar(f,ownerToken,day)).json()).items[0].answer_index,2)
  assert.deepEqual((await (await scopedGrammar(f,memberToken,day)).json()).items,[])
  const payload={date:'2026-11-13',language:'ja',expected_user_id:member,
   answers:[{question_id:'ja-01:today:0',answer_index:1}]}
  assert.equal((await scopedGrammar(f,memberToken,'','POST',payload,'https://evil.invalid')).status,403)
  assert.equal((await scopedGrammar(f,memberToken,'','POST',{...payload,expected_user_id:owner})).status,400,
   'old PWA queued request must not commit under a newly authenticated cookie')
  assert.equal((await scopedGrammar(f,memberToken,'','POST',{...payload,homeflow_user_id:owner})).status,400)
  assert.equal((await scopedGrammar(f,memberToken,'','POST',{...payload,date:'2026-02-30'})).status,400)
  const saved=await scopedGrammar(f,memberToken,'','POST',payload)
  assert.equal(saved.status,200,await saved.clone().text())
  assert.equal((await (await scopedGrammar(f,memberToken,day)).json()).items[0].answer_index,1)
  assert.equal((await (await scopedGrammar(f,ownerToken,day)).json()).items[0].answer_index,2)
  assert.equal((await scopedGrammar(f,memberToken,'','POST',payload)).status,200)
  assert.equal((await scopedGrammar(f,memberToken,'','POST',{...payload,
   answers:[{question_id:'ja-01:today:0',answer_index:3}]})).status,409)
  assert.equal(f.raw.prepare("SELECT COUNT(*) n FROM homeflow_grammar_events WHERE action='answered'").get().n,1)
  assert.equal(f.raw.prepare("SELECT COUNT(*) n FROM homeflow_grammar_events WHERE action='legacy_adopted'").get().n,1)
  assert.deepEqual(f.raw.prepare('SELECT * FROM daily_grammar_answers').all(),old)
  assert.throws(()=>f.raw.prepare(
   'INSERT OR IGNORE INTO homeflow_grammar_answers '+
   '(homeflow_user_id,study_date,language,question_id,answer_index,updated_by_user_id) VALUES(?,?,?,?,?,?)')
   .run(owner,'2026-11-13','ja','ja-01:today:0',3,owner),/GRAMMAR_ANSWER_CONFLICT/,
   'even a raced INSERT OR IGNORE must never silently discard different old answers')
  assert.throws(()=>f.raw.prepare('UPDATE homeflow_grammar_answers SET answer_index=3').run(),/IMMUTABLE_GRAMMAR_ANSWER/)
  assert.throws(()=>f.raw.prepare('DELETE FROM homeflow_grammar_events').run(),/IMMUTABLE_GRAMMAR_AUDIT/)
  assert.throws(()=>f.raw.prepare('INSERT INTO homeflow_grammar_answers(homeflow_user_id,study_date,language,question_id,answer_index,updated_by_user_id) VALUES(?,?,?,?,?,?)')
   .run(owner,'2026-11-13','ja','ja-02:today:0',1,member),/GRAMMAR_OWNER_REQUIRED/)
  f.active.valid=false
  assert.equal((await scopedGrammar(f,memberToken,day)).status,401)
  f.active.valid=true
  f.env.APP_ENV='preview'
  assert.equal((await scopedGrammar(f,memberToken,day)).status,503)
 }finally{f.raw.close()}
})
test('HomeFlow grammar migration rejects broken pages and resumes 20-row batches without data loss',async()=>{
 const f=sqliteEnv()
 try{
  f.env.HOMEFLOW_STUDY_GRAMMAR_ENABLED='true'
  const {ownerToken,memberToken}=await linkedDailyPair(f)
  const insert=f.raw.prepare('INSERT INTO daily_grammar_answers(study_date,language,question_id,answer_index) VALUES(?,?,?,?)')
  for(let i=0;i<24;i++)insert.run('2026-10-'+String(i+1).padStart(2,'0'),'en','en-01:today:0',i%4)
  insert.run('2026-02-30','ja','ja-broken',0)
  const original=f.raw.prepare('SELECT * FROM daily_grammar_answers ORDER BY study_date,language,question_id').all()
  const stopped=await scopedGrammar(f,ownerToken,'/legacy/adopt','POST',{confirm:true})
  assert.equal(stopped.status,409,await stopped.clone().text())
  assert.equal((await stopped.json()).code,'LEGACY_GRAMMAR_REVIEW_REQUIRED')
  assert.equal(f.raw.prepare('SELECT COUNT(*) n FROM homeflow_grammar_answers').get().n,0)
  assert.equal(f.raw.prepare('SELECT COUNT(*) n FROM homeflow_grammar_events').get().n,0)
  assert.deepEqual(f.raw.prepare('SELECT * FROM daily_grammar_answers ORDER BY study_date,language,question_id').all(),original)
  f.raw.prepare("UPDATE daily_grammar_answers SET study_date='2026-02-28' WHERE study_date='2026-02-30'").run()
  const repaired=f.raw.prepare('SELECT * FROM daily_grammar_answers ORDER BY study_date,language,question_id').all()
  const first=await scopedGrammar(f,ownerToken,'/legacy/adopt','POST',{confirm:true})
  assert.equal(first.status,200,await first.clone().text())
  const page=await first.json()
  assert.equal(page.adopted,20);assert.equal(page.has_more,true)
  assert.equal((await (await scopedGrammar(f,ownerToken,'/legacy/adopt','POST',{confirm:true})).json()).adopted,0)
  const second=await scopedGrammar(f,ownerToken,'/legacy/adopt','POST',{confirm:true,...page.next_cursor})
  assert.equal(second.status,200,await second.clone().text())
  assert.equal((await second.json()).adopted,6)
  assert.equal(f.raw.prepare('SELECT COUNT(*) n FROM homeflow_grammar_answers WHERE homeflow_user_id=?').get(owner).n,26)
  assert.equal(f.raw.prepare('SELECT COUNT(*) n FROM homeflow_grammar_answers WHERE homeflow_user_id=?').get(member).n,0)
  assert.equal(f.raw.prepare("SELECT COUNT(*) n FROM homeflow_grammar_events WHERE action='legacy_adopted'").get().n,2)
  assert.deepEqual(f.raw.prepare('SELECT * FROM daily_grammar_answers ORDER BY study_date,language,question_id').all(),repaired)
  assert.equal((await scopedGrammar(f,memberToken,'/legacy/adopt','POST',{confirm:true})).status,403)
  assert.equal((await scopedGrammar(f,ownerToken,'/legacy/adopt','POST',{confirm:true,after_date:'2026-02-30'})).status,400)
 }finally{f.raw.close()}
})

function scopedListening(f,cookie,path='',method='GET',data=null,origin=app){
 const headers={}
 if(cookie)headers.Cookie='__Host-study_hf='+cookie
 if(method==='POST'){headers.Origin=origin;headers['Content-Type']='application/json'}
 return homeflowListening(new Request(app+'/api/homeflow-study/listening'+path,{
  method,headers,body:method==='POST'?JSON.stringify(data??{}):undefined
 }),f.env)
}
test('Stage E private daily listening validates true source identity and locks each spouse answers',async()=>{
 const f=sqliteEnv()
 try{
  const {ownerToken,memberToken}=await linkedDailyPair(f)
  const date='2026-11-13',day='?date='+date+'&language=ja'
  assert.equal((await scopedListening(f,ownerToken,day)).status,503)
  assert.equal((await (await scopedListening(f,memberToken,'/status')).json()).enabled,false)
  f.env.HOMEFLOW_STUDY_LISTENING_ENABLED='true'
  assert.equal((await scopedListening(f,'',day)).status,401)
  assert.deepEqual((await (await scopedListening(f,ownerToken,day)).json()).items,[])
  assert.deepEqual((await (await scopedListening(f,memberToken,day)).json()).items,[])
  const legacy=f.raw.prepare('SELECT * FROM daily_listening_answers').all()
  assert.equal((await scopedListening(f,memberToken,'/legacy/adopt','POST',{confirm:true})).status,403)
  const migrated=await scopedListening(f,ownerToken,'/legacy/adopt','POST',{confirm:true})
  assert.equal(migrated.status,200,await migrated.clone().text())
  assert.equal((await migrated.json()).adopted,1)
  assert.equal((await (await scopedListening(f,ownerToken,'/legacy/adopt','POST',{confirm:true})).json()).adopted,0)
  assert.equal((await (await scopedListening(f,ownerToken,day)).json()).items[0].answer_index,2)
  assert.deepEqual((await (await scopedListening(f,memberToken,day)).json()).items,[])
  const payload={date,language:'ja',expected_user_id:member,
   answers:[{scene_id:'ja-d5',answer_index:1},{scene_id:'ja-w5',answer_index:3}]}
  assert.equal((await scopedListening(f,memberToken,'','POST',payload,'https://evil.invalid')).status,403)
  assert.equal((await scopedListening(f,memberToken,'','POST',{...payload,expected_user_id:owner})).status,400)
  assert.equal((await scopedListening(f,memberToken,'','POST',{...payload,homeflow_user_id:owner})).status,400)
  assert.equal((await scopedListening(f,memberToken,'','POST',{...payload,date:'2026-02-30'})).status,400)
  assert.equal((await scopedListening(f,memberToken,'','POST',{...payload,
   answers:[{scene_id:'ja-d1',answer_index:1}]})).status,400,'wrong day cannot submit another scene')
  const saved=await scopedListening(f,memberToken,'','POST',payload)
  assert.equal(saved.status,200,await saved.clone().text())
  assert.deepEqual((await (await scopedListening(f,memberToken,day)).json()).items.map(x=>x.answer_index),[1,3])
  assert.equal((await (await scopedListening(f,ownerToken,day)).json()).items[0].answer_index,2)
  assert.equal((await scopedListening(f,memberToken,'','POST',payload)).status,200)
  assert.equal((await scopedListening(f,memberToken,'','POST',{...payload,
   answers:[{scene_id:'ja-d5',answer_index:0}]})).status,409)
  assert.equal(f.raw.prepare("SELECT COUNT(*) n FROM homeflow_listening_events WHERE action='answered'").get().n,2)
  assert.equal(f.raw.prepare("SELECT COUNT(*) n FROM homeflow_listening_events WHERE action='legacy_adopted'").get().n,1)
  assert.deepEqual(f.raw.prepare('SELECT * FROM daily_listening_answers').all(),legacy)
  assert.throws(()=>f.raw.prepare('UPDATE homeflow_listening_answers SET answer_index=3').run(),/IMMUTABLE_LISTENING_ANSWER/)
  assert.throws(()=>f.raw.prepare('DELETE FROM homeflow_listening_events').run(),/IMMUTABLE_LISTENING_AUDIT/)
  assert.throws(()=>f.raw.prepare('INSERT INTO homeflow_listening_answers(homeflow_user_id,study_date,language,scene_id,answer_index,updated_by_user_id) VALUES(?,?,?,?,?,?)')
   .run(owner,date,'ja','ja-w5',1,member),/LISTENING_OWNER_REQUIRED/)
  assert.throws(()=>f.raw.prepare('INSERT OR IGNORE INTO homeflow_listening_answers(homeflow_user_id,study_date,language,scene_id,answer_index,updated_by_user_id) VALUES(?,?,?,?,?,?)')
   .run(owner,date,'ja','ja-d5',1,owner),/LISTENING_ANSWER_CONFLICT/)
  f.active.valid=false
  assert.equal((await scopedListening(f,memberToken,day)).status,401)
  f.active.valid=true
  f.env.APP_ENV='preview'
  assert.equal((await scopedListening(f,memberToken,day)).status,503)
 }finally{f.raw.close()}
})
test('Stage E listening old owner pages are lossless and any invalid record blocks the full page',async()=>{
 const f=sqliteEnv()
 try{
  f.env.HOMEFLOW_STUDY_LISTENING_ENABLED='true'
  const {ownerToken,memberToken}=await linkedDailyPair(f)
  const insert=f.raw.prepare('INSERT INTO daily_listening_answers(study_date,language,scene_id,answer_index) VALUES(?,?,?,?)')
  for(let i=1;i<=25;i++){
   const d='2026-10-'+String(i).padStart(2,'0')
   const n=Math.floor(Date.parse(d+'T00:00:00Z')/86400000)%6+1
   insert.run(d,'en','en-w'+n,i%4)
  }
  insert.run('2026-02-30','ja','ja-d2',1)
  const old=f.raw.prepare('SELECT * FROM daily_listening_answers ORDER BY study_date,language,scene_id').all()
  const stopped=await scopedListening(f,ownerToken,'/legacy/adopt','POST',{confirm:true})
  assert.equal(stopped.status,409,await stopped.clone().text())
  assert.equal((await stopped.json()).code,'LEGACY_LISTENING_REVIEW_REQUIRED')
  assert.equal(f.raw.prepare('SELECT COUNT(*) n FROM homeflow_listening_answers').get().n,0)
  assert.equal(f.raw.prepare('SELECT COUNT(*) n FROM homeflow_listening_events').get().n,0)
  assert.deepEqual(f.raw.prepare('SELECT * FROM daily_listening_answers ORDER BY study_date,language,scene_id').all(),old)
  const fixedDate='2026-02-28'
  const fixedIndex=Math.floor(Date.parse(fixedDate+'T00:00:00Z')/86400000)%6+1
  f.raw.prepare("UPDATE daily_listening_answers SET study_date=?,scene_id=? WHERE study_date='2026-02-30'")
   .run(fixedDate,'ja-d'+fixedIndex)
  const repaired=f.raw.prepare('SELECT * FROM daily_listening_answers ORDER BY study_date,language,scene_id').all()
  const first=await scopedListening(f,ownerToken,'/legacy/adopt','POST',{confirm:true})
  assert.equal(first.status,200,await first.clone().text())
  const one=await first.json()
  assert.equal(one.adopted,20);assert.equal(one.has_more,true)
  assert.equal((await (await scopedListening(f,ownerToken,'/legacy/adopt','POST',{confirm:true})).json()).adopted,0)
  const second=await scopedListening(f,ownerToken,'/legacy/adopt','POST',{confirm:true,...one.next_cursor})
  assert.equal(second.status,200,await second.clone().text())
  assert.equal((await second.json()).adopted,7)
  assert.equal(f.raw.prepare('SELECT COUNT(*) n FROM homeflow_listening_answers WHERE homeflow_user_id=?').get(owner).n,27)
  assert.equal(f.raw.prepare('SELECT COUNT(*) n FROM homeflow_listening_answers WHERE homeflow_user_id=?').get(member).n,0)
  assert.equal(f.raw.prepare("SELECT COUNT(*) n FROM homeflow_listening_events WHERE action='legacy_adopted'").get().n,2)
  assert.deepEqual(f.raw.prepare('SELECT * FROM daily_listening_answers ORDER BY study_date,language,scene_id').all(),repaired)
  assert.equal((await scopedListening(f,memberToken,'/legacy/adopt','POST',{confirm:true})).status,403)
  assert.equal((await scopedListening(f,ownerToken,'/legacy/adopt','POST',{confirm:true,after_date:'2026-02-30'})).status,400)
 }finally{f.raw.close()}
})

function scopedWords(f,cookie,path='',method='GET',data=null,origin=app){
 const headers={}
 if(cookie)headers.Cookie='__Host-study_hf='+cookie
 if(method==='POST'){headers.Origin=origin;headers['Content-Type']='application/json'}
 return homeflowDailyWords(new Request(app+'/api/homeflow-study/daily-words'+path,{
  method,headers,body:method==='POST'?JSON.stringify(data??{}):undefined
 }),f.env)
}
test('Stage E daily-word state, grades and audit are independently owned and server-calculated',async()=>{
 const f=sqliteEnv()
 try{
  const {ownerToken,memberToken}=await linkedDailyPair(f)
  const today=new Date(Date.now()+9*3600000).toISOString().slice(0,10)
  const q='?keys='+encodeURIComponent(JSON.stringify(['ja:報告','ja:確認']))
  assert.equal((await scopedWords(f,ownerToken,q)).status,503)
  f.env.HOMEFLOW_STUDY_DAILY_WORDS_ENABLED='true'
  assert.equal((await scopedWords(f,'',q)).status,401)
  assert.deepEqual((await (await scopedWords(f,ownerToken,q)).json()).items,[])
  assert.deepEqual((await (await scopedWords(f,memberToken,q)).json()).items,[])
  const old=f.raw.prepare('SELECT * FROM daily_word_reviews').all()
  assert.equal((await scopedWords(f,memberToken,'/legacy/adopt','POST',{confirm:true})).status,403)
  const adopted=await scopedWords(f,ownerToken,'/legacy/adopt','POST',{confirm:true})
  assert.equal(adopted.status,200,await adopted.clone().text())
  assert.equal((await adopted.json()).adopted,1)
  assert.equal((await (await scopedWords(f,ownerToken,'/legacy/adopt','POST',{confirm:true})).json()).adopted,0)
  assert.equal((await (await scopedWords(f,ownerToken,q)).json()).items[0].streak,2)
  assert.deepEqual((await (await scopedWords(f,memberToken,q)).json()).items,[])
  const payload={word_key:'ja:報告',remembered:false,study_date:today,
   expected_user_id:member,expected_version:0}
  assert.equal((await scopedWords(f,memberToken,'','POST',payload,'https://evil.invalid')).status,403)
  assert.equal((await scopedWords(f,memberToken,'','POST',{...payload,expected_user_id:owner})).status,400,
   'a past-account pending grade cannot run with a new person cookie')
  assert.equal((await scopedWords(f,memberToken,'','POST',{...payload,homeflow_user_id:owner})).status,400)
  assert.equal((await scopedWords(f,memberToken,'','POST',{...payload,study_date:'2026-02-30'})).status,400)
  const scored=await scopedWords(f,memberToken,'','POST',payload)
  assert.equal(scored.status,200,await scored.clone().text())
  const scoredState=await scored.json()
  assert.equal(scoredState.item.streak,0)
  assert.equal(scoredState.item.version,1)
  assert.equal((await scopedWords(f,memberToken,'','POST',payload)).status,200,
   'same day same answer must replay without second audit')
  assert.equal((await scopedWords(f,memberToken,'','POST',{...payload,remembered:true})).status,409)
  const ownerScored=await scopedWords(f,ownerToken,'','POST',
   {...payload,remembered:true,expected_user_id:owner,expected_version:1})
  assert.equal(ownerScored.status,200,await ownerScored.clone().text())
  assert.equal((await ownerScored.json()).item.streak,3)
  assert.equal((await (await scopedWords(f,ownerToken,q)).json()).items[0].streak,3)
  assert.equal((await (await scopedWords(f,memberToken,q)).json()).items[0].streak,0)
  assert.equal(f.raw.prepare("SELECT COUNT(*) n FROM homeflow_daily_word_events WHERE action='graded'").get().n,2)
  assert.equal(f.raw.prepare("SELECT COUNT(*) n FROM homeflow_daily_word_events WHERE action='legacy_adopted'").get().n,1)
  assert.deepEqual(f.raw.prepare('SELECT * FROM daily_word_reviews').all(),old)
  assert.throws(()=>f.raw.prepare("UPDATE homeflow_daily_word_reviews SET streak=4 WHERE word_key='ja:報告'").run(),/DAILY_WORD_INVALID_UPDATE/)
  assert.throws(()=>f.raw.prepare('DELETE FROM homeflow_daily_word_reviews').run(),/DAILY_WORD_DELETE_FORBIDDEN/)
  assert.throws(()=>f.raw.prepare('DELETE FROM homeflow_daily_word_events').run(),/IMMUTABLE_DAILY_WORD_AUDIT/)
  assert.throws(()=>f.raw.prepare('INSERT INTO homeflow_daily_word_reviews(homeflow_user_id,word_key,streak,next_date,last_date,updated_by_user_id) VALUES(?,?,?,?,?,?)')
   .run(owner,'ja:相談',0,'2026-11-05','2026-11-01',member),/DAILY_WORD_OWNER_REQUIRED/)
  assert.throws(()=>f.raw.prepare('INSERT OR IGNORE INTO homeflow_daily_word_reviews(homeflow_user_id,word_key,streak,next_date,last_date,updated_by_user_id) VALUES(?,?,?,?,?,?)')
   .run(owner,'ja:報告',1,'2026-11-05','2026-11-01',owner),/DAILY_WORD_CONFLICT/)
  f.active.valid=false
  assert.equal((await scopedWords(f,memberToken,q)).status,401)
  f.active.valid=true
  f.env.APP_ENV='preview'
  assert.equal((await scopedWords(f,memberToken,q)).status,503)
 }finally{f.raw.close()}
})
test('Stage E private word version, due date and invalid cursor fail closed',async()=>{
 const f=sqliteEnv()
 try{
  f.env.HOMEFLOW_STUDY_DAILY_WORDS_ENABLED='true'
  const {memberToken,ownerToken}=await linkedDailyPair(f)
  const today=new Date(Date.now()+9*3600000).toISOString().slice(0,10)
  const grade={word_key:'ja:確認',remembered:true,study_date:today,
   expected_user_id:member,expected_version:0}
  assert.equal((await scopedWords(f,memberToken,'','POST',{...grade,expected_version:1})).status,409)
  assert.equal((await scopedWords(f,memberToken,'','POST',grade)).status,200)
  const version=f.raw.prepare('SELECT version FROM homeflow_daily_word_reviews WHERE homeflow_user_id=? AND word_key=?').get(member,'ja:確認').version
  assert.equal(version,1)
  assert.equal((await scopedWords(f,memberToken,'','POST',{...grade,remembered:false})).status,409)
  assert.equal((await scopedWords(f,memberToken,'?keys=%5B%22ja%3Abad%22%2C%22ja%3Abad%22%5D')).status,400)
  assert.equal((await scopedWords(f,memberToken,'?after=evil%0Aline')).status,400)
  assert.equal((await scopedWords(f,ownerToken,'/legacy/adopt','POST',{confirm:false})).status,403)
  assert.equal((await scopedWords(f,ownerToken,'/legacy/adopt','POST',{confirm:true,after:'en:bad\n'})).status,400)
 }finally{f.raw.close()}
})
test('Stage E old daily-word pages are owner-only, lossless, and reject any corrupted row',async()=>{
 const f=sqliteEnv()
 try{
  f.env.HOMEFLOW_STUDY_DAILY_WORDS_ENABLED='true'
  const {ownerToken,memberToken}=await linkedDailyPair(f)
  const insert=f.raw.prepare('INSERT INTO daily_word_reviews(word_key,streak,last_date,next_date) VALUES(?,?,?,?)')
  for(let i=1;i<=25;i++)insert.run('en:word'+String(i).padStart(2,'0'),i%6,'2026-10-01','2026-10-04')
  insert.run('en:bad',2,'2026-02-01','2026-02-30')
  const original=f.raw.prepare('SELECT * FROM daily_word_reviews ORDER BY word_key').all()
  const refused=await scopedWords(f,ownerToken,'/legacy/adopt','POST',{confirm:true})
  assert.equal(refused.status,409,await refused.clone().text())
  assert.equal((await refused.json()).code,'LEGACY_WORD_REVIEW_REQUIRED')
  assert.equal(f.raw.prepare('SELECT COUNT(*) n FROM homeflow_daily_word_reviews').get().n,0)
  assert.equal(f.raw.prepare('SELECT COUNT(*) n FROM homeflow_daily_word_events').get().n,0)
  assert.deepEqual(f.raw.prepare('SELECT * FROM daily_word_reviews ORDER BY word_key').all(),original)
  f.raw.prepare("UPDATE daily_word_reviews SET next_date='2026-02-02' WHERE word_key='en:bad'").run()
  const fixed=f.raw.prepare('SELECT * FROM daily_word_reviews ORDER BY word_key').all()
  const first=await scopedWords(f,ownerToken,'/legacy/adopt','POST',{confirm:true})
  assert.equal(first.status,200,await first.clone().text())
  const page=await first.json()
  assert.equal(page.adopted,20);assert.equal(page.has_more,true)
  assert.equal((await (await scopedWords(f,ownerToken,'/legacy/adopt','POST',{confirm:true})).json()).adopted,0)
  const second=await scopedWords(f,ownerToken,'/legacy/adopt','POST',{confirm:true,after:page.next_cursor})
  assert.equal(second.status,200,await second.clone().text())
  assert.equal((await second.json()).adopted,7)
  assert.equal(f.raw.prepare('SELECT COUNT(*) n FROM homeflow_daily_word_reviews WHERE homeflow_user_id=?').get(owner).n,27)
  assert.equal(f.raw.prepare('SELECT COUNT(*) n FROM homeflow_daily_word_reviews WHERE homeflow_user_id=?').get(member).n,0)
  assert.equal(f.raw.prepare("SELECT COUNT(*) n FROM homeflow_daily_word_events WHERE action='legacy_adopted'").get().n,2)
  assert.deepEqual(f.raw.prepare('SELECT * FROM daily_word_reviews ORDER BY word_key').all(),fixed)
  assert.equal((await scopedWords(f,memberToken,'/legacy/adopt','POST',{confirm:true})).status,403)
 }finally{f.raw.close()}
})

test('Stage E rejects stale exam and language mutations after a HomeFlow cookie switch, before D1 writes',async()=>{
 const f=sqliteEnv()
 try{
  f.env.HOMEFLOW_STUDY_EXAMS_ENABLED='true'
  f.env.HOMEFLOW_STUDY_LANGUAGE_ENABLED='true'
  const {ownerToken,memberToken}=await linkedDailyPair(f)
  const snapshots={
   attempts:f.raw.prepare('SELECT COUNT(*) n FROM homeflow_study_attempts').get().n,
   history:f.raw.prepare('SELECT COUNT(*) n FROM homeflow_exam_history').get().n,
   examEvents:f.raw.prepare('SELECT COUNT(*) n FROM homeflow_exam_events').get().n,
   mastery:f.raw.prepare('SELECT COUNT(*) n FROM homeflow_language_mastery').get().n,
   reviews:f.raw.prepare('SELECT COUNT(*) n FROM homeflow_language_reviews').get().n,
   languageEvents:f.raw.prepare('SELECT COUNT(*) n FROM homeflow_language_events').get().n
  }
  const examBody={attempt_id:'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
   question_id:'sg-example-001',answer:'a',duration_seconds:11}
  const historyBody={id:'stale-owner-history-001',date:'2026-11-13',
   exam:'SG 模拟练习',total:60,correct:40}
  const reviewBody={card_id:'ja-sentence-001',grade:'remembered',
   version:0,request_id:'f'.repeat(32)}
  const masteryBody={card_id:'ja-sentence-001',mastered:true,version:0}
  // A previous owner's queued request must not post under the member cookie,
  // even if it passes the current Cookie authentication.
  for(const [family,path,payload] of [
   ['exam','/attempts',examBody],
   ['exam','/history',historyBody],
   ['exam','/legacy/adopt',{confirm:true,kind:'history'}],
   ['language','/mastery',masteryBody],
   ['language','/review',reviewBody],
   ['language','/legacy/adopt',{confirm:true,kind:'mastery'}]
  ]){
   const call=family==='exam'?scopedExams:scopedLanguage
   const switched=await call(f,ownerToken,path,'POST',
    {...payload,expected_user_id:member})
   assert.equal(switched.status,403,
    family+path+' must reject old cookie/user payload before database access')
   assert.equal((await switched.json()).code,'ACTOR_CHANGED')
   const missing=await call(f,ownerToken,path,'POST',
    {...payload,expected_user_id:undefined})
   assert.equal(missing.status,403,family+path+' must require original actor')
   assert.equal((await missing.json()).code,'ACTOR_CHANGED')
  }
  assert.equal(f.raw.prepare('SELECT COUNT(*) n FROM homeflow_study_attempts').get().n,
   snapshots.attempts)
  assert.equal(f.raw.prepare('SELECT COUNT(*) n FROM homeflow_exam_history').get().n,
   snapshots.history)
  assert.equal(f.raw.prepare('SELECT COUNT(*) n FROM homeflow_exam_events').get().n,
   snapshots.examEvents)
  assert.equal(f.raw.prepare('SELECT COUNT(*) n FROM homeflow_language_mastery').get().n,
   snapshots.mastery)
  assert.equal(f.raw.prepare('SELECT COUNT(*) n FROM homeflow_language_reviews').get().n,
   snapshots.reviews)
  assert.equal(f.raw.prepare('SELECT COUNT(*) n FROM homeflow_language_events').get().n,
   snapshots.languageEvents)
  // Rechecking the real session on ordinary reads remains allowed, and an
  // owner never silently imports their legacy single-user data into a spouse.
  assert.equal((await scopedExams(f,memberToken,'/history')).status,200)
  assert.equal((await scopedLanguage(f,memberToken,'/cards?lang=ja')).status,200)
 }finally{f.raw.close()}
})

test('Stage E HomeFlow vocabulary original actor fence rejects stale spouse and replay without changing private data',async()=>{
 const f=sqliteEnv()
 try{
  f.env.HOMEFLOW_STUDY_VOCAB_ENABLED='true'
  const {ownerToken,memberToken}=await linkedDailyPair(f)
  const send=(cookie,path,body)=>homeflowVocabulary(new Request(
   app+'/api/homeflow-study/vocabulary'+path,{
    method:'POST',headers:{Origin:app,'Content-Type':'application/json',
     Cookie:'__Host-study_hf='+cookie},body:JSON.stringify(body)
   }),f.env)
  const count=table=>f.raw.prepare('SELECT COUNT(*) n FROM '+table).get().n
  const item={expected_user_id:owner,language:'ja',term:'報告',action:'save',
   explicit:true,entry:{term:'報告',zh:'管理员的解释'}}
  const old=f.raw.prepare('SELECT * FROM saved_vocabulary_entries_v2').all()
  for(const body of [item,{expected_user_id:owner,language:'ja',term:'報告',action:'remove'}]){
   const denied=await send(memberToken,'',body)
   assert.equal(denied.status,403,await denied.clone().text())
   assert.equal((await denied.json()).code,'ACTOR_CHANGED')
  }
  assert.equal((await send(memberToken,'/legacy/adopt',{confirm:true,expected_user_id:owner})).status,403)
  const missing=await send(ownerToken,'',{...item,expected_user_id:undefined})
  assert.equal(missing.status,403)
  assert.equal(count('homeflow_saved_vocabulary'),0)
  assert.equal(count('homeflow_vocabulary_events'),0)
  const ok=await send(ownerToken,'',item)
  assert.equal(ok.status,200,await ok.clone().text())
  assert.equal((await (await send(ownerToken,'',item)).json()).replayed,true)
  assert.equal(count('homeflow_vocabulary_events'),1)
  const memberOk=await send(memberToken,'',{...item,expected_user_id:member,entry:{term:'報告',zh:'成员解释'}})
  assert.equal(memberOk.status,200,await memberOk.clone().text())
  assert.equal(count('homeflow_saved_vocabulary'),2)
  const one=f.raw.prepare('SELECT entry_json FROM homeflow_saved_vocabulary WHERE homeflow_user_id=? AND term=?')
  assert.equal(JSON.parse(one.get(owner,'報告').entry_json).zh,'管理员的解释')
  assert.equal(JSON.parse(one.get(member,'報告').entry_json).zh,'成员解释')
  assert.deepEqual(f.raw.prepare('SELECT * FROM saved_vocabulary_entries_v2').all(),old)
  f.active.valid=false
  assert.equal((await send(memberToken,'',{...item,expected_user_id:member})).status,401)
  assert.equal(count('homeflow_vocabulary_events'),2)
 }finally{f.raw.close()}
})
