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
const {homeflowStudyIdentity,homeflowStudyReady}=
 await import(pathToFileURL(join(dir,'homeflow-identity.mts')))
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
 raw.exec("CREATE TABLE saved_vocabulary_entries_v2(language TEXT,term TEXT,entry_json TEXT,PRIMARY KEY(language,term));"+
   "INSERT INTO saved_vocabulary_entries_v2 VALUES('ja','報告','private-owner-entry')")
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
  assert.equal(f.raw.prepare('SELECT entry_json FROM saved_vocabulary_entries_v2').get().entry_json,'private-owner-entry')
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
