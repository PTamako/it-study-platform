// Stage E: HomeFlow-scoped daily vocabulary recall. No legacy API or offline queue.
import {verifiedStudyActor,homeflowStudyReady} from './homeflow-identity'
type Env={
 DB:D1Database;APP_ENV?:string;HOMEFLOW_STUDY_SSO_ENABLED?:string
 HOMEFLOW_STUDY_DAILY_WORDS_ENABLED?:string;STUDY_PUBLIC_ORIGIN?:string
 HOMEFLOW_OAUTH_ORIGIN?:string;STUDY_SSO_ENCRYPTION_KEY?:string
 HOMEFLOW_STUDY_SERVICE?:Fetcher
}
type Actor={user_id:string;role:'owner'|'member'}
type State={word_key:string;streak:number;next_date:string;last_date:string;version:number}
type Old={word_key:string;streak:number;next_date:string;last_date:string;updated_at:string}
const json=(v:unknown,status=200)=>new Response(JSON.stringify(v),{status,headers:{
 'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',
 'X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'
}})
const eid=()=>Array.from(crypto.getRandomValues(new Uint8Array(16)),
 n=>n.toString(16).padStart(2,'0')).join('')
const key=(v:unknown):v is string=>typeof v==='string'&&
 v.length<=84&&/^(ja|en):[^:\r\n]{1,80}$/.test(v)
function civil(v:unknown):v is string{
 if(typeof v!=='string'||!/^20\d{2}-\d{2}-\d{2}$/.test(v))return false
 const date=new Date(v+'T00:00:00Z')
 return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===v
}
const tokyo=()=>new Date(Date.now()+9*3600000).toISOString().slice(0,10)
const only=(o:object,allowed:string[])=>Object.keys(o).every(k=>allowed.includes(k))
const safeState=(s:Old)=>key(s.word_key)&&civil(s.last_date)&&civil(s.next_date)&&
 Number.isInteger(s.streak)&&s.streak>=0&&s.streak<=5&&
 s.next_date>s.last_date&&
 (Date.parse(s.next_date+'T00:00:00Z')-Date.parse(s.last_date+'T00:00:00Z'))<=31*86400000&&
 typeof s.updated_at==='string'&&s.updated_at.length>0&&s.updated_at.length<=60
async function body(req:Request,url:URL){
 if(req.headers.get('origin')!==url.origin||
  req.headers.get('content-type')?.split(';')[0].trim().toLowerCase()!=='application/json')
  return null
 try{
  const data=await req.text()
  if(data.length>1400)return null
  const obj=JSON.parse(data) as unknown
  return obj&&typeof obj==='object'&&!Array.isArray(obj)?
   obj as Record<string,unknown>:null
 }catch{return null}
}
async function getKeys(env:Env,actor:Actor,keys:string[]){
 const rows=(await env.DB.prepare(
  'SELECT word_key,streak,next_date,last_date,version FROM homeflow_daily_word_reviews '+
  'WHERE homeflow_user_id=? AND word_key IN ('+keys.map(()=>'?').join(',')+') ORDER BY word_key')
  .bind(actor.user_id,...keys).all<State>()).results||[]
 return json({ok:true,scope:'user',items:rows})
}
async function read(req:Request,env:Env,actor:Actor,url:URL){
 if(url.searchParams.has('keys')){
  const raw=url.searchParams.get('keys')||''
  if(raw.length>900)return json({code:'INVALID_WORD_KEYS'},400)
  let selected:unknown
  try{selected=JSON.parse(raw)}catch{return json({code:'INVALID_WORD_KEYS'},400)}
  if(!Array.isArray(selected)||selected.length<1||selected.length>10||
   !selected.every(key)||new Set(selected).size!==selected.length)
   return json({code:'INVALID_WORD_KEYS'},400)
  return getKeys(env,actor,selected)
 }
 const after=url.searchParams.get('after')||''
 if(after&&!key(after))return json({code:'INVALID_CURSOR'},400)
 const rows=(await env.DB.prepare(
  'SELECT word_key,streak,next_date,last_date,version FROM homeflow_daily_word_reviews '+
  'WHERE homeflow_user_id=? AND word_key>? ORDER BY word_key LIMIT 101')
  .bind(actor.user_id,after).all<State>()).results||[]
 const page=rows.slice(0,100)
 return json({ok:true,scope:'user',items:page,next_cursor:rows.length>100?
  page.at(-1)!.word_key:null})
}
async function grade(req:Request,env:Env,url:URL,actor:Actor){
 const data=await body(req,url)
 if(!data)return json({code:'BAD_ORIGIN_OR_BODY'},403)
 if(!only(data,['word_key','remembered','study_date','expected_user_id','expected_version'])||
  !key(data.word_key)||typeof data.remembered!=='boolean'||
  !civil(data.study_date)||data.study_date!==tokyo()||
  data.expected_user_id!==actor.user_id||
  !Number.isInteger(data.expected_version)||Number(data.expected_version)<0||
  Number(data.expected_version)>1000000)
  return json({code:'INVALID_GRADE_OR_ACCOUNT_CHANGED'},400)
 const word=data.word_key,date=data.study_date,remembered=data.remembered
 const existing=await env.DB.prepare(
  'SELECT word_key,streak,next_date,last_date,version FROM homeflow_daily_word_reviews '+
  'WHERE homeflow_user_id=? AND word_key=?')
  .bind(actor.user_id,word).first<State>()
 if(existing?.last_date===date){
  if((existing.streak>0)!==remembered)return json({code:'SAME_DAY_GRADE_CONFLICT'},409)
  return json({ok:true,scope:'user',item:existing,replayed:true})
 }
 if((existing?.version||0)!==data.expected_version)
  return json({code:'STALE_WORD_VERSION'},409)
 if(existing&&existing.next_date>date)return json({code:'WORD_NOT_DUE'},409)
 const streak=remembered?Math.min(5,(existing?.streak||0)+1):0
 const days=remembered?[1,1,3,7,14,30][streak]:1
 const next=new Date(Date.parse(date+'T00:00:00Z')+days*86400000).toISOString().slice(0,10)
 const stamp=new Date().toISOString()
 const mutation=existing?
  env.DB.prepare('UPDATE homeflow_daily_word_reviews SET streak=?,next_date=?,last_date=?, '+
   'version=version+1,updated_by_user_id=?,updated_at=? '+
   'WHERE homeflow_user_id=? AND word_key=? AND version=? AND last_date<? AND next_date<=?')
   .bind(streak,next,date,actor.user_id,stamp,actor.user_id,word,existing.version,date,date):
  env.DB.prepare('INSERT INTO homeflow_daily_word_reviews '+
   '(homeflow_user_id,word_key,streak,next_date,last_date,version,updated_by_user_id,updated_at) '+
   'VALUES(?,?,?,?,?,1,?,?)')
   .bind(actor.user_id,word,streak,next,date,actor.user_id,stamp)
 const results=await env.DB.batch([
  mutation,
  env.DB.prepare('INSERT INTO homeflow_daily_word_events '+
   '(event_id,actor_user_id,action,affected_count,word_key,remembered,created_at) '+
   "SELECT ?,?,'graded',1,?,?,? WHERE changes()=1")
   .bind(eid(),actor.user_id,word,remembered?1:0,stamp)
 ])
 if(results[0]?.meta?.changes!==1||results[1]?.meta?.changes!==1)
  return json({code:'WORD_GRADE_VERSION_CONFLICT'},409)
 const saved=await env.DB.prepare(
  'SELECT word_key,streak,next_date,last_date,version FROM homeflow_daily_word_reviews '+
  'WHERE homeflow_user_id=? AND word_key=?')
  .bind(actor.user_id,word).first<State>()
 return json({ok:true,scope:'user',item:saved})
}
async function adopt(req:Request,env:Env,url:URL,actor:Actor){
 if(actor.role!=='owner')return json({code:'ONLY_ORIGINAL_OWNER'},403)
 const data=await body(req,url)
 if(!data||data.confirm!==true||!only(data,['confirm','after']))
  return json({code:'CONFIRM_REQUIRED'},403)
 const after=data.after??''
 if(typeof after!=='string'||after!==''&&!key(after))
  return json({code:'INVALID_CURSOR'},400)
 const rows=(await env.DB.prepare(
  'SELECT word_key,streak,next_date,last_date,updated_at FROM daily_word_reviews '+
  'WHERE word_key>? ORDER BY word_key LIMIT 21')
  .bind(after).all<Old>()).results||[]
 const page=rows.slice(0,20)
 if(page.some(x=>!safeState(x)))return json({code:'LEGACY_WORD_REVIEW_REQUIRED'},409)
 if(!page.length)return json({ok:true,scope:'owner_only',adopted:0,has_more:false,
  next_cursor:null,legacy_changed:false})
 for(const row of page){
  const old=await env.DB.prepare('SELECT streak,next_date,last_date FROM homeflow_daily_word_reviews '+
   'WHERE homeflow_user_id=? AND word_key=?')
   .bind(actor.user_id,row.word_key).first<Omit<State,'word_key'|'version'>>()
  if(old&&(old.streak!==row.streak||old.next_date!==row.next_date||
   old.last_date!==row.last_date))
   return json({code:'LEGACY_WORD_CONFLICT'},409)
 }
 const stamp=new Date().toISOString()
 const result=await env.DB.batch([
  env.DB.prepare('INSERT OR IGNORE INTO homeflow_daily_word_reviews '+
   '(homeflow_user_id,word_key,streak,next_date,last_date,version,updated_by_user_id,updated_at) '+
   'SELECT ?,word_key,streak,next_date,last_date,1,?,updated_at FROM daily_word_reviews '+
   'WHERE word_key>? ORDER BY word_key LIMIT 20')
   .bind(actor.user_id,actor.user_id,after),
  env.DB.prepare('INSERT INTO homeflow_daily_word_events '+
   '(event_id,actor_user_id,action,affected_count,word_key,remembered,created_at) '+
   "SELECT ?,?,'legacy_adopted',changes(),NULL,NULL,? WHERE changes()>0")
   .bind(eid(),actor.user_id,stamp)
 ])
 const adopted=result[0]?.meta?.changes??-1
 if(adopted<0||adopted>20||result[1]?.meta?.changes!==(adopted?1:0))
  return json({code:'LEGACY_WORD_CONFLICT'},409)
 return json({ok:true,scope:'owner_only',adopted,has_more:rows.length>20,
  next_cursor:rows.length>20?page.at(-1)!.word_key:null,legacy_changed:false})
}
export async function homeflowDailyWords(req:Request,env:Env):Promise<Response>{
 const url=new URL(req.url)
 const enabled=homeflowStudyReady(env,url)&&env.HOMEFLOW_STUDY_DAILY_WORDS_ENABLED==='true'
 if(url.pathname==='/api/homeflow-study/daily-words/status'&&req.method==='GET')
  return json({enabled,scope:'user',legacy_access:false})
 if(!enabled)return json({code:'STUDY_WORDS_DISABLED'},503)
 try{
  const actor=await verifiedStudyActor(req,env)
  if(!actor)return json({code:'SSO_NOT_AUTHENTICATED'},401)
  if(url.pathname==='/api/homeflow-study/daily-words'){
   if(req.method==='GET')return read(req,env,actor,url)
   if(req.method==='POST')return grade(req,env,url,actor)
  }
  if(url.pathname==='/api/homeflow-study/daily-words/legacy/adopt'&&req.method==='POST')
   return adopt(req,env,url,actor)
  return json({code:'NOT_FOUND'},404)
 }catch{return json({code:'STUDY_WORDS_UNAVAILABLE'},503)}
}
