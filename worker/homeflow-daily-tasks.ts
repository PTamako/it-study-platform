// Stage E: private daily-task completions scoped by the verified HomeFlow
// actor. This does NOT unlock the legacy single-user /api/daily-tasks route.
import {verifiedStudyActor,homeflowStudyReady} from './homeflow-identity'

type Env={
 DB:D1Database
 APP_ENV?:string
 HOMEFLOW_STUDY_SSO_ENABLED?:string
 HOMEFLOW_STUDY_DAILY_PROGRESS_ENABLED?:string
 STUDY_PUBLIC_ORIGIN?:string
 HOMEFLOW_OAUTH_ORIGIN?:string
 STUDY_SSO_ENCRYPTION_KEY?:string
 HOMEFLOW_STUDY_SERVICE?:Fetcher
}
type Actor={user_id:string;household_id:string;role:'owner'|'member'}
type TaskRow={task_id:string;study_date:string;completed:number;version:number;updated_at:string}
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{
 status,headers:{'Content-Type':'application/json; charset=utf-8',
 'Cache-Control':'no-store','X-Content-Type-Options':'nosniff',
 'Referrer-Policy':'no-referrer'}
})
const eventId=()=>Array.from(crypto.getRandomValues(new Uint8Array(16)),
 b=>b.toString(16).padStart(2,'0')).join('')
const hash=async(v:string)=>Array.from(new Uint8Array(await crypto.subtle.digest(
 'SHA-256',new TextEncoder().encode(v))),b=>b.toString(16).padStart(2,'0')).join('')
function civilDate(v:unknown):v is string{
 if(typeof v!=='string'||!/^20[0-9]{2}-[0-9]{2}-[0-9]{2}$/.test(v))return false
 const d=new Date(v+'T00:00:00Z')
 return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===v
}
const taskId=(x:unknown):x is string=>typeof x==='string'&&
 x.length>=1&&x.length<=160&&x.trim()===x&&x.trim().length>0
async function body(req:Request,url:URL){
 if(req.headers.get('origin')!==url.origin||
  req.headers.get('content-type')?.split(';')[0].trim().toLowerCase()!=='application/json')
  return null
 try{
  const text=await req.text()
  if(text.length>1800)return null
  const value=JSON.parse(text) as unknown
  return value&&typeof value==='object'&&!Array.isArray(value)?
   value as Record<string,unknown>:null
 }catch{return null}
}
const validKeys=(v:Record<string,unknown>,keys:string[])=>
 Object.keys(v).every(k=>keys.includes(k))
async function list(env:Env,url:URL,actor:Actor){
 const date=url.searchParams.get('date')||
  new Date(Date.now()+9*3600000).toISOString().slice(0,10)
 const after=url.searchParams.get('after')||''
 const limit=Number(url.searchParams.get('limit')||20)
 if(!civilDate(date))return json({code:'INVALID_DATE'},400)
 if(after!==''&&!taskId(after))return json({code:'INVALID_CURSOR'},400)
 if(!Number.isSafeInteger(limit)||limit<1||limit>50)
  return json({code:'INVALID_LIMIT'},400)
 const res=await env.DB.prepare(
  'SELECT task_id,study_date,completed,version,updated_at FROM homeflow_daily_task_progress '+
  'WHERE homeflow_user_id=? AND study_date=? AND task_id>? ORDER BY task_id LIMIT ?')
  .bind(actor.user_id,date,after,limit+1).all<TaskRow>()
 const rows=res.results||[],items=rows.slice(0,limit)
 return json({ok:true,scope:'user',study_date:date,
  items:items.map(r=>({task_id:r.task_id,study_date:r.study_date,
   completed:r.completed===1,version:r.version,updated_at:r.updated_at})),
  next_cursor:rows.length>limit?items.at(-1)?.task_id:null})
}
async function write(req:Request,env:Env,url:URL,actor:Actor){
 const v=await body(req,url)
 if(!v)return json({code:'BAD_ORIGIN_OR_BODY'},403)
 if(!validKeys(v,['task_id','study_date','completed','version'])||
  !taskId(v.task_id)||!civilDate(v.study_date)||
  typeof v.completed!=='boolean'||
  typeof v.version!=='number'||!Number.isSafeInteger(v.version)||v.version<0||
  Number(v.version)>2147483647)return json({code:'INVALID_PROGRESS'},400)
 const task=v.task_id,date=v.study_date,desired=v.completed?1:0
 const expected=Number(v.version),stamp=new Date().toISOString()
 // A stale tab must not overwrite a newer completion. 0 is create-only.
 // A true replay is harmless and emits zero new audit events.
 const mutation=expected===0?
  env.DB.prepare('INSERT INTO homeflow_daily_task_progress '+
   '(homeflow_user_id,task_id,study_date,completed,version,updated_by_user_id,updated_at) '+
   'VALUES(?,?,?,?,1,?,?) ON CONFLICT(homeflow_user_id,study_date,task_id) DO NOTHING')
   .bind(actor.user_id,task,date,desired,actor.user_id,stamp):
  env.DB.prepare('UPDATE homeflow_daily_task_progress SET completed=?,'+
   'version=version+1,updated_by_user_id=?,updated_at=? '+
   'WHERE homeflow_user_id=? AND task_id=? AND study_date=? '+
   'AND version=? AND completed<>?')
   .bind(desired,actor.user_id,stamp,actor.user_id,task,date,expected,desired)
 const steps=await env.DB.batch([
  mutation,
  env.DB.prepare('INSERT INTO homeflow_daily_task_events '+
   '(event_id,actor_user_id,action,resource_sha256,affected_count,created_at) '+
   'SELECT ?,?,?,?,1,? WHERE changes()=1')
   .bind(eventId(),actor.user_id,desired?'completed':'reopened',
    await hash(date+'\u0000'+task),stamp)
 ])
 if(![0,1].includes(steps[0]?.meta?.changes??-1)||
  steps[1]?.meta?.changes!==steps[0]?.meta?.changes)
  return json({code:'DAILY_WRITE_CONFLICT'},409)
 const row=await env.DB.prepare(
  'SELECT completed,version FROM homeflow_daily_task_progress '+
  'WHERE homeflow_user_id=? AND study_date=? AND task_id=?')
  .bind(actor.user_id,date,task).first<{completed:number;version:number}>()
 if(!row)return json({code:'DAILY_WRITE_CONFLICT'},409)
 if(steps[0].meta.changes===0&&row.completed!==desired)
  return json({code:'VERSION_CONFLICT',current_version:row.version},409)
 return json({ok:true,study_date:date,task_id:task,completed:desired===1,
  version:row.version,replayed:steps[0].meta.changes===0,
  scope:'user',actor_user_id:actor.user_id})
}
async function adopt(req:Request,env:Env,url:URL,actor:Actor){
 // The original owner linked HomeFlow with a still valid signed legacy
 // session. Only that owner may explicitly copy the historical rows.
 if(actor.role!=='owner')return json({code:'ONLY_ORIGINAL_OWNER'},403)
 const data=await body(req,url)
 if(!data||data.confirm!==true||
  !validKeys(data,['confirm','after_date','after_task']))
  return json({code:'CONFIRM_REQUIRED'},403)
 const rawDate=data.after_date===undefined?'':data.after_date
 const rawTask=data.after_task===undefined?'':data.after_task
 if(typeof rawDate!=='string'||typeof rawTask!=='string'||
  (rawDate!==''&&!civilDate(rawDate))||
  (rawTask!==''&&!taskId(rawTask))||
  (rawDate===''&&rawTask!==''))return json({code:'INVALID_CURSOR'},400)
 const afterDate=rawDate,afterTask=rawTask
 const rows=(await env.DB.prepare(
  'SELECT study_date,task_id,completed,updated_at FROM daily_task_completions '+
  'WHERE study_date>? OR (study_date=? AND task_id>?) '+
  'ORDER BY study_date,task_id LIMIT 21')
  .bind(afterDate,afterDate,afterTask)
  .all<{study_date:string;task_id:string;completed:number;updated_at:string}>()).results||[]
 const chosen=rows.slice(0,20)
 if(chosen.some(r=>!civilDate(r.study_date)||!taskId(r.task_id)||
  (r.completed!==0&&r.completed!==1)||
  typeof r.updated_at!=='string'||!r.updated_at||r.updated_at.length>60))
  return json({code:'LEGACY_PROGRESS_REVIEW_REQUIRED'},409)
 if(!chosen.length)return json({ok:true,adopted:0,has_more:false,
  next_cursor:null,scope:'owner_only'})
 const last=chosen.at(-1)!,stamp=new Date().toISOString()
 // A single D1 batch ensures that every new historical row and the minimal
 // owner attribution audit commit together. Old legacy data is read-only.
 const result=await env.DB.batch([
  env.DB.prepare('INSERT OR IGNORE INTO homeflow_daily_task_progress '+
   '(homeflow_user_id,study_date,task_id,completed,version,updated_by_user_id,updated_at) '+
   'SELECT ?,study_date,task_id,completed,1,?,updated_at '+
   'FROM daily_task_completions '+
   'WHERE study_date>? OR (study_date=? AND task_id>?) '+
   'ORDER BY study_date,task_id LIMIT 20')
   .bind(actor.user_id,actor.user_id,afterDate,afterDate,afterTask),
  env.DB.prepare('INSERT INTO homeflow_daily_task_events '+
   '(event_id,actor_user_id,action,resource_sha256,affected_count,created_at) '+
   "SELECT ?,?,'legacy_adopted',NULL,changes(),? WHERE changes()>0")
   .bind(eventId(),actor.user_id,stamp)
 ])
 const count=result[0]?.meta?.changes??-1
 if(count<0||count>20||result[1]?.meta?.changes!==(count>0?1:0))
  return json({code:'LEGACY_ADOPTION_CONFLICT'},409)
 return json({ok:true,adopted:count,has_more:rows.length>20,
  next_cursor:rows.length>20?{after_date:last.study_date,after_task:last.task_id}:null,
  scope:'owner_only',legacy_changed:false})
}
export async function homeflowDailyTasks(req:Request,env:Env):Promise<Response>{
 const url=new URL(req.url)
 if(!homeflowStudyReady(env,url)||env.HOMEFLOW_STUDY_DAILY_PROGRESS_ENABLED!=='true')
  return json({code:'STUDY_DAILY_DISABLED'},503)
 try{
  const actor=await verifiedStudyActor(req,env)
  if(!actor)return json({code:'SSO_NOT_AUTHENTICATED'},401)
  if(url.pathname==='/api/homeflow-study/daily-tasks'){
   if(req.method==='GET')return list(env,url,actor)
   if(req.method==='POST')return write(req,env,url,actor)
  }
  if(url.pathname==='/api/homeflow-study/daily-tasks/legacy/adopt'&&req.method==='POST')
   return adopt(req,env,url,actor)
  return json({code:'NOT_FOUND'},404)
 }catch{return json({code:'STUDY_DAILY_UNAVAILABLE'},503)}
}
