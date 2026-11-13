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
const {homeflowStudyIdentity,homeflowStudyReady}=
 await import(pathToFileURL(join(dir,'homeflow-identity.mts')))
const {homeflowVocabulary}=
 await import(pathToFileURL(join(dir,'homeflow-vocabulary.mts')))
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
 raw.exec("CREATE TABLE saved_vocabulary_entries_v2(language TEXT,term TEXT,entry_json TEXT,saved_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,PRIMARY KEY(language,term));")
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
    method,headers,body:method==='POST'?JSON.stringify(body||{}):undefined
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
  assert.equal((await read.json()).items.length,0,'member never inherits original owner's vocabulary')
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
    body:method==='POST'?JSON.stringify(body):undefined
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
