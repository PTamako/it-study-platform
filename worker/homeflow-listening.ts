// Stage E HomeFlow listening answers: independently authenticated, no legacy cache.
import {verifiedStudyActor,homeflowStudyReady} from './homeflow-identity'
type Env={
 DB:D1Database;APP_ENV?:string;HOMEFLOW_STUDY_SSO_ENABLED?:string
 HOMEFLOW_STUDY_LISTENING_ENABLED?:string;STUDY_PUBLIC_ORIGIN?:string
 HOMEFLOW_OAUTH_ORIGIN?:string;STUDY_SSO_ENCRYPTION_KEY?:string
 HOMEFLOW_STUDY_SERVICE?:Fetcher
}
type Actor={user_id:string;role:'owner'|'member'}
type Answer={scene_id:string;answer_index:number}
type Old={study_date:string;language:string;scene_id:string;answer_index:number;updated_at:string}
const json=(v:unknown,status=200)=>new Response(JSON.stringify(v),{status,headers:{
 'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',
 'X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'
}})
const eid=()=>Array.from(crypto.getRandomValues(new Uint8Array(16)),
 n=>n.toString(16).padStart(2,'0')).join('')
function civilDate(v:unknown):v is string{
 if(typeof v!=='string'||!/^20\d{2}-\d{2}-\d{2}$/.test(v))return false
 const d=new Date(v+'T00:00:00Z')
 return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===v
}
const language=(v:unknown):v is 'ja'|'en'=>v==='ja'||v==='en'
const answer=(v:unknown):v is number=>typeof v==='number'&&
 Number.isInteger(v)&&v>=0&&v<=3
const cleanId=(v:unknown):v is string=>typeof v==='string'&&
 v.length>0&&v.length<=160&&v.trim()===v&&!/[\r\n\u0000]/.test(v)
function validScene(date:string,lang:'ja'|'en',scene:unknown){
 if(typeof scene!=='string')return false
 const index=Math.floor(Date.parse(date+'T00:00:00Z')/86400000)%6+1
 return scene===lang+'-d'+index||scene===lang+'-w'+index
}
const only=(o:object,keys:string[])=>Object.keys(o).every(k=>keys.includes(k))
async function requestBody(req:Request,url:URL){
 if(req.headers.get('origin')!==url.origin||
  req.headers.get('content-type')?.split(';')[0].trim().toLowerCase()!=='application/json')
  return null
 try{
  const raw=await req.text()
  if(raw.length>1800)return null
  const data=JSON.parse(raw) as unknown
  return data&&typeof data==='object'&&!Array.isArray(data)?
   data as Record<string,unknown>:null
 }catch{return null}
}
async function read(env:Env,actor:Actor,date:string,lang:'ja'|'en'){
 const rows=(await env.DB.prepare(
  'SELECT scene_id,answer_index FROM homeflow_listening_answers WHERE '+
  'homeflow_user_id=? AND study_date=? AND language=? ORDER BY scene_id LIMIT 3')
  .bind(actor.user_id,date,lang).all<Answer>()).results||[]
 if(rows.length>2)return json({code:'LISTENING_RECORDS_REVIEW_REQUIRED'},409)
 return json({ok:true,scope:'user',date,language:lang,items:rows})
}
async function write(req:Request,env:Env,url:URL,actor:Actor){
 const data=await requestBody(req,url)
 if(!data)return json({code:'BAD_ORIGIN_OR_BODY'},403)
 if(!only(data,['date','language','answers','expected_user_id'])||
  !civilDate(data.date)||!language(data.language)||
  data.expected_user_id!==actor.user_id||!Array.isArray(data.answers)||
  data.answers.length<1||data.answers.length>2)
  return json({code:'INVALID_LISTENING_REQUEST_OR_ACCOUNT_CHANGED'},400)
 const d=data.date,l=data.language,answers=data.answers as Answer[]
 if(answers.some(a=>!a||typeof a!=='object'||Array.isArray(a)||
  !only(a,['scene_id','answer_index'])||!validScene(d,l,a.scene_id)||
  !answer(a.answer_index))||
  new Set(answers.map(a=>a.scene_id)).size!==answers.length)
  return json({code:'INVALID_LISTENING_ANSWERS'},400)
 const existing=(await env.DB.prepare(
  'SELECT scene_id,answer_index FROM homeflow_listening_answers WHERE '+
  'homeflow_user_id=? AND study_date=? AND language=? LIMIT 3')
  .bind(actor.user_id,d,l).all<Answer>()).results||[]
 if(existing.length>2)return json({code:'LISTENING_RECORDS_REVIEW_REQUIRED'},409)
 const known=new Map(existing.map(x=>[x.scene_id,x.answer_index]))
 if(answers.some(a=>known.has(a.scene_id)&&known.get(a.scene_id)!==a.answer_index))
  return json({code:'ANSWER_ALREADY_RECORDED'},409)
 const missing=answers.filter(a=>!known.has(a.scene_id))
 if(existing.length+missing.length>2)return json({code:'DAILY_LISTENING_LIMIT'},409)
 if(!missing.length)return read(env,actor,d,l)
 const stamp=new Date().toISOString()
 const statements=[]
 for(const a of missing){
  statements.push(env.DB.prepare(
   'INSERT OR IGNORE INTO homeflow_listening_answers '+
   '(homeflow_user_id,study_date,language,scene_id,answer_index,updated_by_user_id,updated_at) '+
   'VALUES(?,?,?,?,?,?,?)')
   .bind(actor.user_id,d,l,a.scene_id,a.answer_index,actor.user_id,stamp))
  statements.push(env.DB.prepare(
   "INSERT INTO homeflow_listening_events(event_id,actor_user_id,action,affected_count,created_at) "+
   "SELECT ?,?,'answered',1,? WHERE changes()=1")
   .bind(eid(),actor.user_id,stamp))
 }
 const results=await env.DB.batch(statements)
 for(let i=0;i<results.length;i+=2)
  if(![0,1].includes(results[i]?.meta?.changes??-1)||
   results[i+1]?.meta?.changes!==results[i]?.meta?.changes)
   return json({code:'LISTENING_WRITE_CONFLICT'},409)
 const response=await read(env,actor,d,l)
 if(response.status!==200)return response
 const saved=await response.clone().json() as {items:Answer[]}
 if(answers.some(a=>saved.items.find(x=>x.scene_id===a.scene_id)?.answer_index!==a.answer_index))
  return json({code:'ANSWER_ALREADY_RECORDED'},409)
 return response
}
async function adopt(req:Request,env:Env,url:URL,actor:Actor){
 if(actor.role!=='owner')return json({code:'ONLY_ORIGINAL_OWNER'},403)
 const data=await requestBody(req,url)
 if(!data||data.confirm!==true||
  !only(data,['confirm','after_date','after_language','after_scene']))
  return json({code:'CONFIRM_REQUIRED'},403)
 const d=data.after_date??'',l=data.after_language??'',s=data.after_scene??''
 if(typeof d!=='string'||typeof l!=='string'||typeof s!=='string'||
  (d!==''&&!civilDate(d))||(l!==''&&!language(l))||
  (s!==''&&!cleanId(s))||(d===''&&(l!==''||s!==''))||
  (l===''&&s!==''))return json({code:'INVALID_CURSOR'},400)
 const rows=(await env.DB.prepare(
  'SELECT study_date,language,scene_id,answer_index,updated_at FROM daily_listening_answers '+
  'WHERE (study_date,language,scene_id)>(?,?,?) '+
  'ORDER BY study_date,language,scene_id LIMIT 21')
  .bind(d,l,s).all<Old>()).results||[]
 const page=rows.slice(0,20)
 if(page.some(x=>!civilDate(x.study_date)||!language(x.language)||
  !validScene(x.study_date,x.language,x.scene_id)||
  !answer(x.answer_index)||typeof x.updated_at!=='string'||
  !x.updated_at||x.updated_at.length>60))
  return json({code:'LEGACY_LISTENING_REVIEW_REQUIRED'},409)
 if(!page.length)return json({ok:true,scope:'owner_only',adopted:0,has_more:false,
  next_cursor:null,legacy_changed:false})
 for(const x of page){
  const current=await env.DB.prepare('SELECT answer_index FROM homeflow_listening_answers '+
   'WHERE homeflow_user_id=? AND study_date=? AND language=? AND scene_id=?')
   .bind(actor.user_id,x.study_date,x.language,x.scene_id).first<{answer_index:number}>()
  if(current&&current.answer_index!==x.answer_index)
   return json({code:'LEGACY_LISTENING_CONFLICT'},409)
 }
 const stamp=new Date().toISOString()
 const result=await env.DB.batch([
  env.DB.prepare('INSERT OR IGNORE INTO homeflow_listening_answers '+
   '(homeflow_user_id,study_date,language,scene_id,answer_index,updated_by_user_id,updated_at) '+
   'SELECT ?,study_date,language,scene_id,answer_index,?,updated_at '+
   'FROM daily_listening_answers WHERE (study_date,language,scene_id)>(?,?,?) '+
   'ORDER BY study_date,language,scene_id LIMIT 20')
   .bind(actor.user_id,actor.user_id,d,l,s),
  env.DB.prepare("INSERT INTO homeflow_listening_events "+
   "(event_id,actor_user_id,action,affected_count,created_at) "+
   "SELECT ?,?,'legacy_adopted',changes(),? WHERE changes()>0")
   .bind(eid(),actor.user_id,stamp)
 ])
 const count=result[0]?.meta?.changes??-1
 if(count<0||count>20||result[1]?.meta?.changes!==(count>0?1:0))
  return json({code:'LEGACY_LISTENING_CONFLICT'},409)
 const last=page.at(-1)!
 return json({ok:true,scope:'owner_only',adopted:count,has_more:rows.length>20,
  next_cursor:rows.length>20?{after_date:last.study_date,
   after_language:last.language,after_scene:last.scene_id}:null,
  legacy_changed:false})
}
export async function homeflowListening(req:Request,env:Env):Promise<Response>{
 const url=new URL(req.url)
 const enabled=homeflowStudyReady(env,url)&&
  env.HOMEFLOW_STUDY_LISTENING_ENABLED==='true'
 if(url.pathname==='/api/homeflow-study/listening/status'&&req.method==='GET')
  return json({enabled,scope:'user',legacy_access:false})
 if(!enabled)return json({code:'STUDY_LISTENING_DISABLED'},503)
 try{
  const actor=await verifiedStudyActor(req,env)
  if(!actor)return json({code:'SSO_NOT_AUTHENTICATED'},401)
  if(url.pathname==='/api/homeflow-study/listening'){
   if(req.method==='GET'){
    const d=url.searchParams.get('date'),l=url.searchParams.get('language')
    if(!civilDate(d)||!language(l))return json({code:'INVALID_DAY_OR_LANGUAGE'},400)
    return read(env,actor,d,l)
   }
   if(req.method==='POST')return write(req,env,url,actor)
  }
  if(url.pathname==='/api/homeflow-study/listening/legacy/adopt'&&req.method==='POST')
   return adopt(req,env,url,actor)
  return json({code:'NOT_FOUND'},404)
 }catch{return json({code:'STUDY_LISTENING_UNAVAILABLE'},503)}
}
