// Stage E: a *new*, user-scoped vocabulary API. Legacy /api/vocabulary/saved
// and all other single-user study endpoints remain independent and must NOT
// accept HomeFlow's new identity cookie until full personal isolation ships.
// Two people may bookmark the same (language,term) without sharing state.
import {verifiedStudyActor,homeflowStudyReady} from './homeflow-identity'

type StudyEnv={
 DB:D1Database
 APP_ENV?:string
 HOMEFLOW_STUDY_SSO_ENABLED?:string
 HOMEFLOW_STUDY_VOCAB_ENABLED?:string
 STUDY_PUBLIC_ORIGIN?:string
 HOMEFLOW_OAUTH_ORIGIN?:string
 STUDY_SSO_ENCRYPTION_KEY?:string
 HOMEFLOW_STUDY_SERVICE?:Fetcher
}
type Actor={user_id:string;household_id:string;role:'owner'|'member'}
const languages=new Set(['auto','ja','en','zh'])
const enc=new TextEncoder()
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{
 status,headers:{'Content-Type':'application/json; charset=utf-8',
  'Cache-Control':'no-store','X-Content-Type-Options':'nosniff',
  'Referrer-Policy':'no-referrer'}
})
const token=()=>Array.from(crypto.getRandomValues(new Uint8Array(16)),
 b=>b.toString(16).padStart(2,'0')).join('')
const sha=async(t:string)=>Array.from(new Uint8Array(
 await crypto.subtle.digest('SHA-256',enc.encode(t))),
 b=>b.toString(16).padStart(2,'0')).join('')
function cursor(value:string){
 if(!value)return {language:'',term:''}
 const m=/^(auto|en|ja|zh):(.*)$/s.exec(value)
 return m&&m[2].length<=100?{language:m[1],term:m[2]}:null
}
async function readMutation(req:Request,url:URL){
 if(req.headers.get('origin')!==url.origin||
  req.headers.get('content-type')?.split(';')[0].trim().toLowerCase()!=='application/json')
  return null
 try{
  const raw=await req.text()
  const v=raw.length<=18000?JSON.parse(raw):null
  return v&&typeof v==='object'&&!Array.isArray(v)?v as Record<string,unknown>:null
 }catch{return null}
}
async function list(env:StudyEnv,url:URL,user:Actor){
 const after=url.searchParams.get('after')||''
 const page=cursor(after)
 if(!page)return json({code:'INVALID_CURSOR'},400)
 const requested=Number(url.searchParams.get('limit')||20)
 if(!Number.isSafeInteger(requested)||requested<1||requested>20)
  return json({code:'INVALID_LIMIT'},400)
 const sync=url.searchParams.get('sync')==='1'
 const rows=await env.DB.prepare(
  'SELECT language,term,entry_json,is_deleted,saved_at FROM homeflow_saved_vocabulary '+
  'WHERE homeflow_user_id=? AND (language>? OR(language=? AND term>?)) '+
  'AND (?=1 OR is_deleted=0) ORDER BY language,term LIMIT ?')
  .bind(user.user_id,page.language,page.language,page.term,sync?1:0,requested+1)
  .all<Record<string,unknown>>()
 const pageRows=(rows.results||[]).slice(0,requested)
 return json({ok:true,items:pageRows.map(r=>({
  language:r.language,term:r.term,is_deleted:r.is_deleted===1,
  entry:r.is_deleted===1?null:JSON.parse(String(r.entry_json)),
  saved_at:r.saved_at
 })),next_cursor:(rows.results||[]).length>requested?
  String(pageRows.at(-1)?.language)+':'+String(pageRows.at(-1)?.term):null,
  scope:'user',actor_user_id:user.user_id})
}
async function save(req:Request,env:StudyEnv,url:URL,user:Actor){
 const data=await readMutation(req,url)
 if(!data)return json({code:'BAD_ORIGIN_OR_BODY'},403)
 if(Object.keys(data).some(k=>!['language','term','action','entry','explicit'].includes(k)))
  return json({code:'INVALID_FIELDS'},400)
 const language=data.language,term=data.term,action=data.action
 if(typeof language!=='string'||!languages.has(language)||
  typeof term!=='string'||!term.trim()||term.length>100||
  !['save','remove'].includes(String(action)))return json({code:'INVALID_WORD'},400)
 if(action==='save'&&data.explicit!==true)
  return json({code:'EXPLICIT_SAVE_REQUIRED'},409)
 if(action==='remove'&&(data.entry!==undefined||data.explicit!==undefined))
  return json({code:'INVALID_REMOVE'},400)
 if(action==='save'&&(!data.entry||typeof data.entry!=='object'||
  Array.isArray(data.entry)||Object.keys(data.entry as object).some(k=>k==='_zhixue_deleted_v1')))
  return json({code:'INVALID_ENTRY'},400)
 const raw=action==='remove'?'{}':JSON.stringify(data.entry)
 if(raw.length>15000)return json({code:'ENTRY_TOO_LARGE'},413)
 const removed=action==='remove'?1:0
 const stamp=new Date().toISOString()
 const h=await sha(language+'\u0000'+term)
 const batch=await env.DB.batch([
  env.DB.prepare('INSERT INTO homeflow_saved_vocabulary '+
   '(homeflow_user_id,language,term,entry_json,is_deleted,updated_by_user_id,saved_at) '+
   'VALUES(?,?,?,?,?,?,?) ON CONFLICT(homeflow_user_id,language,term) DO UPDATE SET '+
   'entry_json=excluded.entry_json,is_deleted=excluded.is_deleted,'+
   'updated_by_user_id=excluded.updated_by_user_id,saved_at=excluded.saved_at '+
   'WHERE homeflow_saved_vocabulary.entry_json<>excluded.entry_json '+
   'OR homeflow_saved_vocabulary.is_deleted<>excluded.is_deleted')
   .bind(user.user_id,language,term,raw,removed,user.user_id,stamp),
  env.DB.prepare('INSERT INTO homeflow_vocabulary_events '+
   '(event_id,actor_user_id,action,term_sha256,affected_count,created_at) '+
   "SELECT ?,?,?,?,1,? WHERE changes()=1")
   .bind(token(),user.user_id,removed?'removed':'saved',h,stamp)
 ])
 if(![0,1].includes(batch[0]?.meta?.changes??-1)||
  batch[1]?.meta?.changes!==batch[0]?.meta?.changes)
  return json({code:'VOCABULARY_WRITE_CONFLICT'},409)
 return json({ok:true,term,language,saved:removed===0,
  actor_user_id:user.user_id,replayed:batch[0].meta.changes===0})
}
async function adopt(req:Request,env:StudyEnv,url:URL,user:Actor){
 // HomeFlow owner has already completed original 12h legacy proof during
 // first account binding. New members must NEVER claim old private words.
 if(user.role!=='owner')return json({code:'ONLY_ORIGINAL_OWNER'},403)
 const body=await readMutation(req,url)
 if(!body||body.confirm!==true||
  Object.keys(body).some(k=>!['confirm','after'].includes(k)))
  return json({code:'CONFIRM_REQUIRED'},403)
 const after=typeof body.after==='string'?body.after:''
 const page=cursor(after)
 if(!page)return json({code:'INVALID_CURSOR'},400)
 const rows=(await env.DB.prepare(
  'SELECT language,term FROM saved_vocabulary_entries_v2 '+
  'WHERE language>? OR (language=? AND term>?) '+
  'ORDER BY language,term LIMIT 21')
  .bind(page.language,page.language,page.term).all<{language:string;term:string}>()).results||[]
 const chosen=rows.slice(0,20)
 if(!chosen.length)return json({ok:true,adopted:0,
  has_more:false,next_cursor:null,scope:'owner_only'})
 if(chosen.some(r=>!languages.has(r.language)||r.term.length<1||r.term.length>100))
  return json({code:'LEGACY_CONTENT_REVIEW_REQUIRED'},409)
 const end=chosen.at(-1)!
 const stamp=new Date().toISOString()
 // The old table is READ ONLY. Preserve any already edited/removed owner
 // entry in the scoped table with INSERT OR IGNORE; no owner data is erased.
 const changes=await env.DB.batch([
  env.DB.prepare('INSERT OR IGNORE INTO homeflow_saved_vocabulary '+
   '(homeflow_user_id,language,term,entry_json,is_deleted,updated_by_user_id,saved_at) '+
   'SELECT ?,v.language,v.term,'+
   "CASE WHEN COALESCE(json_extract(v.entry_json,'$._zhixue_deleted_v1'),0)=1 "+
   "THEN '{}' ELSE v.entry_json END,"+
   "CASE WHEN COALESCE(json_extract(v.entry_json,'$._zhixue_deleted_v1'),0)=1 "+
   'THEN 1 ELSE 0 END,?,v.saved_at '+
   'FROM saved_vocabulary_entries_v2 v '+
   'WHERE (v.language>? OR (v.language=? AND v.term>?)) '+
   'AND json_valid(v.entry_json) '+
   'ORDER BY v.language,v.term LIMIT 20')
   .bind(user.user_id,user.user_id,page.language,page.language,page.term),
  env.DB.prepare('INSERT INTO homeflow_vocabulary_events '+
   '(event_id,actor_user_id,action,term_sha256,affected_count,created_at) '+
   "SELECT ?,?,'legacy_adopted',NULL,changes(),? WHERE changes()>0")
   .bind(token(),user.user_id,stamp)
 ])
 const count=Number(changes[0]?.meta?.changes??-1)
 if(count<0||count>20||Number(changes[1]?.meta?.changes)!==(count>0?1:0))
  return json({code:'LEGACY_ADOPTION_CONFLICT'},409)
 return json({ok:true,adopted:count,has_more:rows.length>20,
  next_cursor:rows.length>20?end.language+':'+end.term:null,
  scope:'owner_only',ledger_changed:false})
}
export async function homeflowVocabulary(req:Request,env:StudyEnv):Promise<Response>{
 const url=new URL(req.url)
 if(!homeflowStudyReady(env,url)||env.HOMEFLOW_STUDY_VOCAB_ENABLED!=='true')
  return json({code:'STUDY_VOCAB_DISABLED'},503)
 try{
  const user=await verifiedStudyActor(req,env)
  if(!user)return json({code:'SSO_NOT_AUTHENTICATED'},401)
  if(url.pathname==='/api/homeflow-study/vocabulary'){
   if(req.method==='GET')return await list(env,url,user)
   if(req.method==='POST')return await save(req,env,url,user)
  }
  if(url.pathname==='/api/homeflow-study/vocabulary/legacy/adopt'&&req.method==='POST')
   return await adopt(req,env,url,user)
  return json({code:'NOT_FOUND'},404)
 }catch{return json({code:'STUDY_VOCAB_UNAVAILABLE'},503)}
}
