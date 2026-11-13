// Stage E: HomeFlow-scoped grammar answers. Never authorizes legacy /api/grammar-progress.
// New answers are online-only: no shared localStorage/IndexedDB or replay queue.
import {verifiedStudyActor,homeflowStudyReady} from './homeflow-identity'

type Env={
 DB:D1Database;APP_ENV?:string;HOMEFLOW_STUDY_SSO_ENABLED?:string
 HOMEFLOW_STUDY_GRAMMAR_ENABLED?:string;STUDY_PUBLIC_ORIGIN?:string
 HOMEFLOW_OAUTH_ORIGIN?:string;STUDY_SSO_ENCRYPTION_KEY?:string
 HOMEFLOW_STUDY_SERVICE?:Fetcher
}
type Actor={user_id:string;role:'owner'|'member'}
type Answer={question_id:string;answer_index:number}
type LegacyRow={study_date:string;language:string;question_id:string;answer_index:number;updated_at:string}
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{
 'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',
 'X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'
}})
const eventId=()=>Array.from(crypto.getRandomValues(new Uint8Array(16)),
 b=>b.toString(16).padStart(2,'0')).join('')
function date(v:unknown):v is string{
 if(typeof v!=='string'||!/^20\d{2}-\d{2}-\d{2}$/.test(v))return false
 const parsed=new Date(v+'T00:00:00Z')
 return Number.isFinite(parsed.getTime())&&parsed.toISOString().slice(0,10)===v
}
const lang=(v:unknown):v is 'ja'|'en'=>v==='ja'||v==='en'
const id=(v:unknown):v is string=>typeof v==='string'&&
 v.length>=1&&v.length<=160&&v.trim()===v&&!/[\r\n\u0000]/.test(v)
const submittedId=(v:unknown,l:'ja'|'en')=>id(v)&&
 new RegExp('^'+l+'-(?:0[1-9]|1[0-2]):(?:today|review):[01]$').test(v)
const answerIndex=(v:unknown):v is number=>typeof v==='number'&&
 Number.isInteger(v)&&v>=0&&v<=3
const keys=(o:object,allowed:string[])=>
 Object.keys(o).every(k=>allowed.includes(k))
async function body(req:Request,url:URL){
 if(req.headers.get('origin')!==url.origin||
  req.headers.get('content-type')?.split(';')[0].trim().toLowerCase()!=='application/json')
  return null
 try{
  const raw=await req.text()
  if(raw.length>2200)return null
  const data=JSON.parse(raw) as unknown
  return data&&typeof data==='object'&&!Array.isArray(data)?
   data as Record<string,unknown>:null
 }catch{return null}
}
async function list(env:Env,actor:Actor,studyDate:string,language:'ja'|'en'){
 const rows=(await env.DB.prepare(
  'SELECT question_id,answer_index FROM homeflow_grammar_answers '+
  'WHERE homeflow_user_id=? AND study_date=? AND language=? ORDER BY question_id LIMIT 4')
  .bind(actor.user_id,studyDate,language).all<Answer>()).results||[]
 if(rows.length>3)return json({code:'GRAMMAR_HISTORY_REVIEW_REQUIRED'},409)
 return json({ok:true,scope:'user',date:studyDate,language,items:rows})
}
async function submit(req:Request,env:Env,url:URL,actor:Actor){
 const data=await body(req,url)
 if(!data)return json({code:'BAD_ORIGIN_OR_BODY'},403)
 if(!keys(data,['date','language','answers','expected_user_id'])||
  !date(data.date)||!lang(data.language)||
  data.expected_user_id!==actor.user_id||
  !Array.isArray(data.answers)||data.answers.length<1||data.answers.length>3)
  return json({code:'INVALID_GRAMMAR_REQUEST_OR_ACCOUNT_CHANGED'},400)
 const studyDate=data.date,language=data.language
 const answers=data.answers as Answer[]
 if(answers.some(a=>!a||typeof a!=='object'||Array.isArray(a)||
  !keys(a,['question_id','answer_index'])||
  !submittedId(a.question_id,language)||!answerIndex(a.answer_index))||
  new Set(answers.map(a=>a.question_id)).size!==answers.length)
  return json({code:'INVALID_GRAMMAR_ANSWERS'},400)
 // Reject changed historical answers rather than overwriting the first answer.
 const previous=(await env.DB.prepare(
  'SELECT question_id,answer_index FROM homeflow_grammar_answers '+
  'WHERE homeflow_user_id=? AND study_date=? AND language=? LIMIT 4')
  .bind(actor.user_id,studyDate,language).all<Answer>()).results||[]
 if(previous.length>3)return json({code:'GRAMMAR_HISTORY_REVIEW_REQUIRED'},409)
 const existing=new Map(previous.map(r=>[r.question_id,r.answer_index]))
 if(answers.some(a=>existing.has(a.question_id as string)&&
  existing.get(a.question_id as string)!==a.answer_index))
  return json({code:'ANSWER_ALREADY_RECORDED'},409)
 const missing=answers.filter(a=>!existing.has(a.question_id as string))
 if(previous.length+missing.length>3)return json({code:'DAILY_GRAMMAR_LIMIT'},409)
 if(!missing.length)return list(env,actor,studyDate,language)
 const stamp=new Date().toISOString()
 const statements=[]
 for(const answer of missing){
  statements.push(env.DB.prepare(
   'INSERT OR IGNORE INTO homeflow_grammar_answers '+
   '(homeflow_user_id,study_date,language,question_id,answer_index,updated_by_user_id,updated_at) '+
   'VALUES(?,?,?,?,?,?,?)')
   .bind(actor.user_id,studyDate,language,answer.question_id,answer.answer_index,actor.user_id,stamp))
  statements.push(env.DB.prepare(
   "INSERT INTO homeflow_grammar_events(event_id,actor_user_id,action,affected_count,created_at) "+
   "SELECT ?,?,'answered',1,? WHERE changes()=1")
   .bind(eventId(),actor.user_id,stamp))
 }
 const result=await env.DB.batch(statements)
 for(let i=0;i<result.length;i+=2)
  if(![0,1].includes(result[i]?.meta?.changes??-1)||
   result[i+1]?.meta?.changes!==result[i]?.meta?.changes)
   return json({code:'GRAMMAR_WRITE_CONFLICT'},409)
 // A concurrent first writer with a different answer must not appear as success.
 const response=await list(env,actor,studyDate,language)
 if(response.status!==200)return response
 const current=await response.clone().json() as {items:Answer[]}
 if(answers.some(a=>current.items.find(x=>x.question_id===a.question_id)?.answer_index!==a.answer_index))
  return json({code:'ANSWER_ALREADY_RECORDED'},409)
 return response
}
async function adopt(req:Request,env:Env,url:URL,actor:Actor){
 if(actor.role!=='owner')return json({code:'ONLY_ORIGINAL_OWNER'},403)
 const data=await body(req,url)
 if(!data||data.confirm!==true||
  !keys(data,['confirm','after_date','after_language','after_question'])||
  typeof data.after_date!=='string'&&data.after_date!==undefined||
  typeof data.after_language!=='string'&&data.after_language!==undefined||
  typeof data.after_question!=='string'&&data.after_question!==undefined)
  return json({code:'CONFIRM_REQUIRED'},403)
 const d=data.after_date||'',l=data.after_language||'',q=data.after_question||''
 if(typeof d!=='string'||typeof l!=='string'||typeof q!=='string'||
  (d!==''&&!date(d))||(l!==''&&!lang(l))||(q!==''&&!id(q))||
  (d===''&&(l!==''||q!==''))||(l===''&&q!==''))
  return json({code:'INVALID_CURSOR'},400)
 const rows=(await env.DB.prepare(
  'SELECT study_date,language,question_id,answer_index,updated_at FROM daily_grammar_answers '+
  'WHERE (study_date,language,question_id)>(?,?,?) '+
  'ORDER BY study_date,language,question_id LIMIT 21')
  .bind(d,l,q).all<LegacyRow>()).results||[]
 const batch=rows.slice(0,20)
 if(batch.some(r=>!date(r.study_date)||!lang(r.language)||!id(r.question_id)||
  !answerIndex(r.answer_index)||typeof r.updated_at!=='string'||
  !r.updated_at||r.updated_at.length>60))
  return json({code:'LEGACY_GRAMMAR_REVIEW_REQUIRED'},409)
 if(!batch.length)return json({ok:true,scope:'owner_only',adopted:0,
  has_more:false,next_cursor:null,legacy_changed:false})
 // Preflight existing same-key answers; never suppress differing owner history.
 for(const row of batch){
  const same=await env.DB.prepare(
   'SELECT answer_index FROM homeflow_grammar_answers '+
   'WHERE homeflow_user_id=? AND study_date=? AND language=? AND question_id=?')
   .bind(actor.user_id,row.study_date,row.language,row.question_id)
   .first<{answer_index:number}>()
  if(same&&same.answer_index!==row.answer_index)
   return json({code:'LEGACY_GRAMMAR_CONFLICT'},409)
 }
 const stamp=new Date().toISOString()
 const results=await env.DB.batch([
  env.DB.prepare('INSERT OR IGNORE INTO homeflow_grammar_answers '+
   '(homeflow_user_id,study_date,language,question_id,answer_index,updated_by_user_id,updated_at) '+
   'SELECT ?,study_date,language,question_id,answer_index,?,updated_at '+
   'FROM daily_grammar_answers WHERE (study_date,language,question_id)>(?,?,?) '+
   'ORDER BY study_date,language,question_id LIMIT 20')
   .bind(actor.user_id,actor.user_id,d,l,q),
  env.DB.prepare(
   "INSERT INTO homeflow_grammar_events(event_id,actor_user_id,action,affected_count,created_at) "+
   "SELECT ?,?,'legacy_adopted',changes(),? WHERE changes()>0")
   .bind(eventId(),actor.user_id,stamp)
 ])
 const changes=results[0]?.meta?.changes??-1
 if(changes<0||changes>20||results[1]?.meta?.changes!==(changes?1:0))
  return json({code:'LEGACY_GRAMMAR_CONFLICT'},409)
 const last=batch.at(-1)!
 return json({ok:true,scope:'owner_only',adopted:changes,has_more:rows.length>20,
  next_cursor:rows.length>20?{after_date:last.study_date,
   after_language:last.language,after_question:last.question_id}:null,
  legacy_changed:false})
}
export async function homeflowGrammar(req:Request,env:Env):Promise<Response>{
 const url=new URL(req.url)
 const enabled=homeflowStudyReady(env,url)&&env.HOMEFLOW_STUDY_GRAMMAR_ENABLED==='true'
 if(url.pathname==='/api/homeflow-study/grammar/status'&&req.method==='GET')
  return json({enabled,scope:'user',legacy_access:false})
 if(!enabled)return json({code:'STUDY_GRAMMAR_DISABLED'},503)
 try{
  const actor=await verifiedStudyActor(req,env)
  if(!actor)return json({code:'SSO_NOT_AUTHENTICATED'},401)
  if(url.pathname==='/api/homeflow-study/grammar'){
   if(req.method==='GET'){
    const d=url.searchParams.get('date'),l=url.searchParams.get('language')
    if(!date(d)||!lang(l))return json({code:'INVALID_DAY_OR_LANGUAGE'},400)
    return list(env,actor,d,l)
   }
   if(req.method==='POST')return submit(req,env,url,actor)
  }
  if(url.pathname==='/api/homeflow-study/grammar/legacy/adopt'&&req.method==='POST')
   return adopt(req,env,url,actor)
  return json({code:'NOT_FOUND'},404)
 }catch{return json({code:'STUDY_GRAMMAR_UNAVAILABLE'},503)}
}
