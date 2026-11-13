import { requireAuth } from './auth'

type StudyEnv = {
 DB: D1Database
 AUTH_PASSWORD?: string
 AUTH_SESSION_SECRET?: string
 APP_ENV?: string
 HOMEFLOW_STUDY_SSO_ENABLED?: string
 STUDY_PUBLIC_ORIGIN?: string
 HOMEFLOW_OAUTH_ORIGIN?: string
 STUDY_SSO_ENCRYPTION_KEY?: string
 HOMEFLOW_STUDY_SERVICE?: Fetcher
}
type HFUser={user_id:string,household_id:string,role:'owner'|'member',
 nickname:string,assertion:string,assertionSeconds:number}
const CLIENT='it-study-platform'
const PENDING_MS=300000
const SESSION_MS=900000
const enc=new TextEncoder()
const json=(body:unknown,status=200,headers:Record<string,string>={})=>
 new Response(JSON.stringify(body),{status,headers:{
  'Content-Type':'application/json; charset=utf-8',
  'Cache-Control':'no-store','Referrer-Policy':'no-referrer',
  'X-Content-Type-Options':'nosniff',...headers}})
const rnd=()=>Array.from(crypto.getRandomValues(new Uint8Array(32)),
 b=>b.toString(16).padStart(2,'0')).join('')
const hex=(v:unknown):v is string=>typeof v==='string'&&/^[0-9a-f]{64}$/.test(v)
const sha=async(v:string)=>Array.from(new Uint8Array(
 await crypto.subtle.digest('SHA-256',enc.encode(v))),
 b=>b.toString(16).padStart(2,'0')).join('')
const base64=(v:Uint8Array)=>btoa(String.fromCharCode(...v))
const from64=(v:string)=>Uint8Array.from(atob(v),x=>x.charCodeAt(0))
function origin(v:unknown){
 try{if(typeof v!=='string')return false
  const u=new URL(v)
  return u.protocol==='https:'&&u.origin===v&&!u.username&&!u.password&&
   !u.hash&&!u.search}catch{return false}
}
export function homeflowStudyReady(env:StudyEnv,url:URL){
 return env.APP_ENV==='production'&&env.HOMEFLOW_STUDY_SSO_ENABLED==='true'&&
  origin(env.STUDY_PUBLIC_ORIGIN)&&env.STUDY_PUBLIC_ORIGIN===url.origin&&
  origin(env.HOMEFLOW_OAUTH_ORIGIN)&&
  typeof env.STUDY_SSO_ENCRYPTION_KEY==='string'&&
  /^[0-9a-f]{64}$/i.test(env.STUDY_SSO_ENCRYPTION_KEY)&&
  typeof env.DB?.prepare==='function'&&
  typeof env.HOMEFLOW_STUDY_SERVICE?.fetch==='function'
}
async function secret(env:StudyEnv){
 const bytes=Uint8Array.from(env.STUDY_SSO_ENCRYPTION_KEY!.match(/.{2}/g)!,
  x=>parseInt(x,16))
 return crypto.subtle.importKey('raw',bytes,'AES-GCM',false,['encrypt','decrypt'])
}
async function encrypt(env:StudyEnv,scope:string,value:string){
 const iv=crypto.getRandomValues(new Uint8Array(12))
 const data=await crypto.subtle.encrypt({name:'AES-GCM',iv,
  additionalData:enc.encode(scope)},await secret(env),enc.encode(value))
 return {cipher:base64(new Uint8Array(data)),iv:base64(iv)}
}
async function decrypt(env:StudyEnv,scope:string,cipher:string,iv:string){
 try{
  const data=await crypto.subtle.decrypt({name:'AES-GCM',iv:from64(iv),
   additionalData:enc.encode(scope)},await secret(env),from64(cipher))
  return new TextDecoder().decode(data)
 }catch{return null}
}
function cookie(req:Request,name:string){
 const raw=req.headers.get('cookie')||''
 return raw.split(';').map(v=>v.trim()).find(v=>v.startsWith(name+'='))?.slice(name.length+1)||''
}
async function oldSession(req:Request,env:StudyEnv){
 // Only a STILL VALID signed legacy session can claim the old study history.
 if(await requireAuth(req,env))return null
 const value=cookie(req,'__Host-study_session')
 if(!value||value.length>2048||value.length<32)return null
 return sha(value)
}
function callback(env:StudyEnv){return env.STUDY_PUBLIC_ORIGIN!+'/api/homeflow-sso/callback'}
async function start(req:Request,env:StudyEnv,url:URL){
 if(req.method!=='POST')return json({code:'METHOD_NOT_ALLOWED'},405)
 if(req.headers.get('origin')!==url.origin)return json({code:'BAD_ORIGIN'},403)
 const state=rnd(),resume=rnd(),verifier=rnd()+rnd().slice(0,24)
 const scope=await sha(state),proof=await oldSession(req,env)
 const hash=new Uint8Array(await crypto.subtle.digest('SHA-256',enc.encode(verifier)))
 const challenge=base64(hash).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_')
 const sealed=await encrypt(env,scope,verifier),stamp=Date.now()
 await env.DB.prepare('INSERT INTO homeflow_oauth_pending '+
  '(state_hash,resume_hash,verifier_cipher,verifier_iv,has_legacy_owner_proof,'+
  "legacy_session_hash,origin,status,expires_at,created_at) VALUES(?,?,?,?,?,?,?,'pending',?,?)")
  .bind(scope,await sha(resume),sealed.cipher,sealed.iv,proof?1:0,
   proof,url.origin,stamp+PENDING_MS,stamp).run()
 const redirect=new URL('/authorize',env.HOMEFLOW_OAUTH_ORIGIN)
 for(const [key,value] of Object.entries({response_type:'code',client_id:CLIENT,
   redirect_uri:callback(env),code_challenge:challenge,
   code_challenge_method:'S256',state,nonce:rnd()}))
  redirect.searchParams.set(key,value)
 return json({ok:true,authorization_url:redirect.toString(),
  state,resume_secret:resume,expires_in:300})
}
async function parked(req:Request,env:StudyEnv,url:URL){
 if(req.method!=='GET')return json({code:'METHOD_NOT_ALLOWED'},405)
 const state=url.searchParams.get('state'),code=url.searchParams.get('code')
 if(!hex(state)||!hex(code)||url.searchParams.has('error'))
  return json({code:'INVALID_CALLBACK'},403)
 const scope=await sha(state),sealed=await encrypt(env,scope,code)
 const result=await env.DB.prepare('UPDATE homeflow_oauth_pending '+
  "SET code_cipher=?,code_iv=? WHERE state_hash=? AND origin=? AND status='pending' "+
  'AND code_cipher IS NULL AND expires_at>?')
  .bind(sealed.cipher,sealed.iv,scope,url.origin,Date.now()).run()
 if(result.meta.changes!==1)return json({code:'SSO_REPLAY_OR_EXPIRED'},403)
 // The Safari callback MUST NOT set a PWA session cookie.
 return new Response('<!doctype html><html lang="zh"><meta charset="utf-8">'+
  '<title>HomeFlow 授权</title><body><h1>授权已收到</h1>'+
  '<p>请返回知学 App，点击“完成登录”。</p></body></html>',{
   headers:{'Content-Type':'text/html; charset=utf-8',
    'Cache-Control':'no-store','Referrer-Policy':'no-referrer',
    'X-Content-Type-Options':'nosniff',
    'Content-Security-Policy':"default-src 'none'; frame-ancestors 'none'"}})
}
async function homeflowUser(env:StudyEnv,code:string,verifier:string):Promise<HFUser|null>{
 const req=new Request(new URL('/api/oauth/token',env.HOMEFLOW_OAUTH_ORIGIN),{
  method:'POST',redirect:'manual',headers:{
   'Content-Type':'application/x-www-form-urlencoded','Accept':'application/json'},
  body:new URLSearchParams({grant_type:'authorization_code',client_id:CLIENT,
   code,code_verifier:verifier,redirect_uri:callback(env)}).toString()
 })
 let response:Response
 try{response=await env.HOMEFLOW_STUDY_SERVICE!.fetch(req)}catch{return null}
 if(!response.ok||response.status!==200||response.headers.get('location'))return null
 const token=await response.json() as Record<string,unknown>
 if(token.token_type!=='Bearer'||!hex(token.access_token)||!hex(token.session_assertion)||
   !Number.isInteger(token.expires_in)||Number(token.expires_in)>180||
   Number(token.expires_in)<1||!Number.isInteger(token.session_assertion_expires_in)||
   Number(token.session_assertion_expires_in)>900||
   Number(token.session_assertion_expires_in)<1)return null
 const profile=new Request(new URL('/api/oauth/userinfo',env.HOMEFLOW_OAUTH_ORIGIN),{
  method:'GET',redirect:'manual',
  headers:{Authorization:'Bearer '+token.access_token,Accept:'application/json'}
 })
 let userResponse:Response
 try{userResponse=await env.HOMEFLOW_STUDY_SERVICE!.fetch(profile)}catch{return null}
 if(!userResponse.ok||userResponse.status!==200||userResponse.headers.get('location'))return null
 const info=await userResponse.json() as Record<string,unknown>
 if(info.sub!==info.user_id||info.audience!==CLIENT||
  typeof info.user_id!=='string'||!/^[0-9a-f-]{32,64}$/i.test(info.user_id)||
  typeof info.household_id!=='string'||!/^[a-zA-Z0-9_-]{1,128}$/.test(info.household_id)||
  !['owner','member'].includes(String(info.role))||
  typeof info.nickname!=='string'||!info.nickname.trim()||
  info.nickname.length>80)return null
 return {user_id:info.user_id,household_id:info.household_id,
  role:info.role as 'owner'|'member',nickname:info.nickname.trim().slice(0,50),
  assertion:token.session_assertion,assertionSeconds:Number(token.session_assertion_expires_in)}
}
async function finish(req:Request,env:StudyEnv,url:URL){
 if(req.method!=='POST')return json({code:'METHOD_NOT_ALLOWED'},405)
 if(req.headers.get('origin')!==url.origin||
  !(req.headers.get('content-type')||'').toLowerCase().startsWith('application/json'))
  return json({code:'BAD_ORIGIN_OR_BODY'},403)
 let data:Record<string,unknown>
 try{
  const raw=await req.text()
  if(raw.length>1024)throw Error('body too large')
  data=JSON.parse(raw) as Record<string,unknown>
 }catch{return json({code:'INVALID_PROOF'},403)}
 if(!hex(data?.state)||!hex(data?.resume_secret))
  return json({code:'INVALID_PROOF'},403)
 const scope=await sha(data.state)
 const row=await env.DB.prepare('SELECT * FROM homeflow_oauth_pending '+
  "WHERE state_hash=? AND origin=? AND status='pending' AND code_cipher IS NOT NULL "+
  'AND expires_at>?').bind(scope,url.origin,Date.now()).first<Record<string,unknown>>()
 if(!row||row.resume_hash!==await sha(data.resume_secret))return json({code:'INVALID_PROOF'},403)
 const old=await oldSession(req,env)
 if(Number(row.has_legacy_owner_proof)===1&&
   (!old||old!==row.legacy_session_hash))
  return json({code:'OWNER_PROOF_EXPIRED'},403)
 const claimed=await env.DB.prepare("UPDATE homeflow_oauth_pending SET status='processing' "+
  "WHERE state_hash=? AND status='pending' AND code_cipher IS NOT NULL AND expires_at>?")
  .bind(scope,Date.now()).run()
 if(claimed.meta.changes!==1)return json({code:'SSO_REPLAY'},403)
 const fail=async(code:string)=>{
  await env.DB.prepare("UPDATE homeflow_oauth_pending SET status='failed',code_cipher=NULL,code_iv=NULL "+
   "WHERE state_hash=? AND status='processing'").bind(scope).run().catch(()=>null)
  return json({code},403)
 }
 const verifier=await decrypt(env,scope,String(row.verifier_cipher),String(row.verifier_iv))
 const code=await decrypt(env,scope,String(row.code_cipher),String(row.code_iv))
 if(!verifier||!/^[A-Za-z0-9._~-]{43,128}$/.test(verifier)||!hex(code))
  return fail('INVALID_STATE')
 const user=await homeflowUser(env,code,verifier)
 if(!user)return fail('UNVERIFIED_IDENTITY')
 try{
  const db=env.DB
  const existing=await db.prepare('SELECT * FROM homeflow_identity_links WHERE homeflow_user_id=?')
   .bind(user.user_id).first<Record<string,unknown>>()
  const owner=await db.prepare("SELECT homeflow_user_id,homeflow_household_id "+
   "FROM homeflow_identity_links WHERE role='owner' AND state='active' LIMIT 1")
   .first<Record<string,unknown>>()
  if(owner&&(owner.homeflow_household_id!==user.household_id||
    (user.role==='owner'&&owner.homeflow_user_id!==user.user_id)))
   return fail('HOUSEHOLD_CONFLICT')
  if(existing&&(existing.state!=='active'||
    existing.homeflow_household_id!==user.household_id||
    existing.role!==user.role))return fail('LINK_CONFLICT')
  if(!existing&&user.role==='owner'&&
    (!old||row.legacy_session_hash!==old))return fail('OWNER_PROOF_REQUIRED')
  if(!existing&&user.role==='member'&&!owner)return fail('OWNER_FIRST')
  const stamp=Date.now(),session=rnd(),sealed=await encrypt(env,scope,user.assertion)
  const expires=stamp+Math.min(SESSION_MS,user.assertionSeconds*1000)
  const stmts=[]
  if(!existing)stmts.push(db.prepare('INSERT INTO homeflow_identity_links '+
   '(homeflow_user_id,homeflow_household_id,role,display_name,created_at) VALUES(?,?,?,?,?)')
   .bind(user.user_id,user.household_id,user.role,user.nickname,stamp))
  else stmts.push(db.prepare('UPDATE homeflow_identity_links SET display_name=? '+
   "WHERE homeflow_user_id=? AND state='active'").bind(user.nickname,user.user_id))
  stmts.push(db.prepare('INSERT INTO homeflow_identity_sessions '+
   '(token_hash,homeflow_user_id,assertion_cipher,assertion_iv,assertion_scope,expires_at,created_at) '+
   'VALUES(?,?,?,?,?,?,?)').bind(await sha(session),user.user_id,
   sealed.cipher,sealed.iv,scope,expires,stamp))
  stmts.push(db.prepare('INSERT INTO homeflow_identity_audit '+
   '(event_id,actor_user_id,kind,created_at) VALUES(?,?,?,?)')
   .bind(rnd(),user.user_id,existing?'sso_login':'account_linked',stamp))
  stmts.push(db.prepare('UPDATE homeflow_oauth_pending '+
   "SET status='consumed',code_cipher=NULL,code_iv=NULL WHERE state_hash=? AND status='processing'")
   .bind(scope))
  const done=await db.batch(stmts)
  if(done.some(v=>v.meta?.changes!==1))return fail('IDENTITY_WRITE_FAILED')
  return json({ok:true,user_id:user.user_id,household_id:user.household_id,
   role:user.role,display_name:user.nickname,study_access:false},200,{
   'Set-Cookie':'__Host-study_hf='+session+
    '; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=900'})
 }catch{return fail('IDENTITY_WRITE_FAILED')}
}
async function me(req:Request,env:StudyEnv){
 const session=cookie(req,'__Host-study_hf')
 if(!hex(session))return json({code:'SSO_NOT_AUTHENTICATED'},401)
 const row=await env.DB.prepare('SELECT s.*,l.homeflow_household_id,l.role,l.state '+
  'FROM homeflow_identity_sessions s JOIN homeflow_identity_links l '+
  'ON l.homeflow_user_id=s.homeflow_user_id '+
  "WHERE s.token_hash=? AND s.expires_at>? AND s.revoked_at IS NULL AND l.state='active'")
  .bind(await sha(session),Date.now()).first<Record<string,unknown>>()
 if(!row)return json({code:'SSO_NOT_AUTHENTICATED'},401)
 const assertion=await decrypt(env,String(row.assertion_scope),
  String(row.assertion_cipher),String(row.assertion_iv))
 if(!hex(assertion))return json({code:'SSO_NOT_AUTHENTICATED'},401)
 const check=new Request(new URL('/api/oauth/session-introspect',env.HOMEFLOW_OAUTH_ORIGIN),{
  method:'POST',redirect:'manual',
  headers:{'Content-Type':'application/x-www-form-urlencoded'},
  body:new URLSearchParams({client_id:CLIENT,session_assertion:assertion}).toString()
 })
 let response:Response
 try{response=await env.HOMEFLOW_STUDY_SERVICE!.fetch(check)}
 catch{return json({code:'SSO_NOT_AUTHENTICATED'},401)}
 if(response.status!==200||!response.ok||response.headers.get('location'))
  return json({code:'SSO_NOT_AUTHENTICATED'},401)
 const live=await response.json() as Record<string,unknown>
 if(live.active!==true||live.audience!==CLIENT||
  live.sub!==live.user_id||live.user_id!==row.homeflow_user_id||
  live.household_id!==row.homeflow_household_id||live.role!==row.role||
  typeof live.nickname!=='string'||!live.nickname.trim()||live.nickname.length>80)
  return json({code:'SSO_NOT_AUTHENTICATED'},401)
 return json({ok:true,identity:{user_id:live.user_id,
  household_id:live.household_id,role:live.role,display_name:live.nickname.trim()},
  study_access:false,requires_stage_e:true})
}
async function logout(req:Request,env:StudyEnv,url:URL){
 if(req.method!=='POST')return json({code:'METHOD_NOT_ALLOWED'},405)
 if(req.headers.get('origin')!==url.origin)return json({code:'BAD_ORIGIN'},403)
 const session=cookie(req,'__Host-study_hf')
 if(hex(session)){
  const digest=await sha(session)
  const found=await env.DB.prepare('SELECT homeflow_user_id FROM homeflow_identity_sessions WHERE token_hash=?')
   .bind(digest).first<{homeflow_user_id:string}>()
  if(found){
   try{
    const stamp=Date.now()
    await env.DB.batch([
     env.DB.prepare('UPDATE homeflow_identity_sessions SET revoked_at=? '+
      'WHERE token_hash=? AND revoked_at IS NULL').bind(stamp,digest),
     env.DB.prepare('INSERT INTO homeflow_identity_audit '+
      "(event_id,actor_user_id,kind,created_at) VALUES(?,?,'sso_logout',?)")
      .bind(rnd(),found.homeflow_user_id,stamp)
    ])
   }catch{return json({code:'LOGOUT_UNAVAILABLE'},503)}
  }
 }
 return json({ok:true},200,{'Set-Cookie':'__Host-study_hf=; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=0'})
}
export async function homeflowStudyIdentity(req:Request,env:StudyEnv):Promise<Response>{
 const url=new URL(req.url),action=url.pathname.slice('/api/homeflow-sso/'.length)
 if(action==='status'&&req.method==='GET')
  return json({enabled:homeflowStudyReady(env,url),study_access:false})
 if(!homeflowStudyReady(env,url))return json({code:'SSO_DISABLED'},503)
 try{
  if(action==='start')return start(req,env,url)
  if(action==='callback')return parked(req,env,url)
  if(action==='complete')return finish(req,env,url)
  if(action==='me'&&req.method==='GET')return me(req,env)
  if(action==='logout')return logout(req,env,url)
  return json({code:'NOT_FOUND'},404)
 }catch{return json({code:'SSO_INTERNAL_ERROR'},503)}
}
