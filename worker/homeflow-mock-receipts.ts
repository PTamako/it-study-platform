// Explicit, lossless, owner-only adoption of historical mock submission receipts.
// Copies legacy raw payload/result bytes; no regrading, deleting or rewriting.
import {verifiedStudyActor,homeflowStudyReady} from './homeflow-identity'

type Env={DB:D1Database;APP_ENV?:string;HOMEFLOW_STUDY_SSO_ENABLED?:string;
 HOMEFLOW_STUDY_EXAMS_ENABLED?:string;HOMEFLOW_STUDY_MOCK_ENABLED?:string;
 STUDY_PUBLIC_ORIGIN?:string;HOMEFLOW_OAUTH_ORIGIN?:string;
 STUDY_SSO_ENCRYPTION_KEY?:string;HOMEFLOW_STUDY_SERVICE?:Fetcher}
type Actor={user_id:string;role:'owner'|'member'}
type OldRow={id:string;track_id:string;exam_section:string;payload_json:string;
 result_json:string;created_at:string}
type TargetRow=OldRow&{study_date:string}
const json=(v:unknown,status=200)=>new Response(JSON.stringify(v),{status,headers:{
 'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',
 'X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'}})
const uuid=(s:unknown):s is string=>typeof s==='string'&&
 /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s)
const safeDate=(s:unknown):s is string=>{
 if(typeof s!=='string'||!/^20[0-9]{2}-[0-9]{2}-[0-9]{2}$/.test(s))return false
 const d=new Date(s+'T00:00:00Z')
 return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===s
}
const eventId=()=>Array.from(crypto.getRandomValues(new Uint8Array(16)),
 b=>b.toString(16).padStart(2,'0')).join('')
const hash=async(s:string)=>Array.from(new Uint8Array(await crypto.subtle.digest(
 'SHA-256',new TextEncoder().encode(s))),b=>b.toString(16).padStart(2,'0')).join('')
function format(t:unknown,s:unknown):number{
 if(t==='exam-sg'&&s==='SG')return 60
 if(t==='exam-fe'&&s==='A')return 60
 if(t==='exam-fe'&&s==='B')return 20
 return 0
}
function rawObject(x:string):Record<string,unknown>|null{
 try{
  const p:unknown=JSON.parse(x)
  return p&&typeof p==='object'&&!Array.isArray(p)?p as Record<string,unknown>:null
 }catch{return null}
}
function normalized(row:OldRow):TargetRow|null{
 if(!uuid(row.id)||typeof row.payload_json!=='string'||
  typeof row.result_json!=='string'||typeof row.created_at!=='string'||
  row.created_at.length<10||row.created_at.length>64||
  row.payload_json.length>35000||row.result_json.length>250000)return null
 const required=format(row.track_id,row.exam_section)
 if(!required)return null
 const payload=rawObject(row.payload_json),result=rawObject(row.result_json)
 if(!payload||!result||payload.track!==row.track_id||
  payload.section!==row.exam_section||!safeDate(payload.date)||
  !Number.isSafeInteger(payload.duration)||Number(payload.duration)<0||
  Number(payload.duration)>86400||!Array.isArray(payload.answers)||
  payload.answers.length!==required)return null
 if(Object.keys(payload).some(k=>!['track','section','date','duration','answers'].includes(k)))return null
 const answers=payload.answers as unknown[]
 const seen=new Set<string>()
 for(const entry of answers){
  if(!entry||typeof entry!=='object'||Array.isArray(entry))return null
  const a=entry as Record<string,unknown>
  if(typeof a.question_id!=='string'||a.question_id.length<1||
   a.question_id.length>120||!a.question_id.trim()||
   typeof a.answer!=='string'||a.answer.length>10||
   Object.keys(a).some(k=>!['question_id','answer'].includes(k))||
   seen.has(a.question_id))return null
  seen.add(a.question_id)
 }
 if(result.ok!==true||result.submission_id!==row.id||
  result.track!==row.track_id||result.section!==row.exam_section||
  result.study_date!==payload.date||result.total!==required||
  !Number.isSafeInteger(result.correct_count)||
  Number(result.correct_count)<0||Number(result.correct_count)>required||
  typeof result.exam_name!=='string'||result.exam_name.length<1||
  result.exam_name.length>120||!Array.isArray(result.review)||
  result.review.length!==required)return null
 let correct=0
 for(let i=0;i<required;i++){
  const item=result.review[i]
  if(!item||typeof item!=='object'||Array.isArray(item))return null
  const review=item as Record<string,unknown>
  const a=answers[i] as Record<string,unknown>
  if(review.id!==a.question_id||
   typeof review.answer!=='string'||
   typeof review.explanation!=='string')return null
  if(review.answer===a.answer)correct++
 }
 if(correct!==result.correct_count)return null
 return {...row,study_date:payload.date}
}
async function list(env:Env,actor:Actor,url:URL){
 const after=url.searchParams.get('after')||''
 const limit=Number(url.searchParams.get('limit')||10)
 if(after&&!uuid(after))return json({code:'INVALID_CURSOR'},400)
 if(!Number.isSafeInteger(limit)||limit<1||limit>20)
  return json({code:'INVALID_LIMIT'},400)
 const {results}=await env.DB.prepare(
  'SELECT m.id,m.track_id,m.exam_section,m.study_date,m.created_at,'+
  "json_extract(m.result_json,'$.correct_count') AS correct_count,"+
  "json_extract(m.result_json,'$.total') AS total,"+
  'EXISTS(SELECT 1 FROM homeflow_mock_legacy_adoptions a '+
  'WHERE a.actor_user_id=m.homeflow_user_id AND a.original_submission_id=m.id) AS legacy_imported '+
  'FROM homeflow_mock_exam_submissions m WHERE m.homeflow_user_id=? AND m.id>? '+
  'ORDER BY m.id LIMIT ?')
  .bind(actor.user_id,after,limit+1).all<Record<string,unknown>>()
 const page=(results||[]).slice(0,limit)
 return json({ok:true,scope:'user',items:page.map(x=>({
  id:x.id,track:x.track_id,section:x.exam_section,date:x.study_date,
  created_at:x.created_at,correct:Number(x.correct_count),total:Number(x.total),
  legacy_imported:x.legacy_imported===1
 })),next_cursor:(results||[]).length>limit?page.at(-1)?.id:null})
}
async function detail(env:Env,actor:Actor,url:URL){
 const sid=url.searchParams.get('id')
 if(!uuid(sid))return json({code:'INVALID_SUBMISSION_ID'},400)
 const row=await env.DB.prepare('SELECT m.id,m.track_id,m.exam_section,'+
  'm.study_date,m.payload_json,m.result_json,m.created_at,'+
  'EXISTS(SELECT 1 FROM homeflow_mock_legacy_adoptions a WHERE '+
  'a.actor_user_id=m.homeflow_user_id AND a.original_submission_id=m.id) AS legacy_imported '+
  'FROM homeflow_mock_exam_submissions m WHERE m.homeflow_user_id=? AND m.id=?')
  .bind(actor.user_id,sid).first<TargetRow&{legacy_imported:number}>()
 if(!row)return json({code:'RECEIPT_NOT_FOUND'},404)
 const summary=rawObject(row.result_json)
 if(!summary||summary.ok!==true)return json({code:'RECEIPT_REVIEW_REQUIRED'},409)
 return json({ok:true,scope:'user',id:row.id,track:row.track_id,
  section:row.exam_section,study_date:row.study_date,
  created_at:row.created_at,legacy_imported:row.legacy_imported===1,
  result:{...summary,scope:'user'}})
}
async function adopt(req:Request,env:Env,url:URL,actor:Actor){
 if(actor.role!=='owner')return json({code:'ONLY_ORIGINAL_OWNER'},403)
 if(req.headers.get('origin')!==url.origin||
  req.headers.get('content-type')?.split(';')[0].trim().toLowerCase()!=='application/json')
  return json({code:'BAD_ORIGIN_OR_BODY'},403)
 let form:Record<string,unknown>
 try{
  const raw=await req.text()
  if(raw.length>500)throw Error('too large')
  const parsed:unknown=JSON.parse(raw)
  if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))throw Error('bad')
  form=parsed as Record<string,unknown>
 }catch{return json({code:'INVALID_ADOPTION_REQUEST'},400)}
 if(form.confirm!==true||
  Object.keys(form).some(k=>!['confirm','after'].includes(k)))
  return json({code:'CONFIRM_REQUIRED'},403)
 const after=form.after===undefined?'':form.after
 if(typeof after!=='string'||(after!==''&&!uuid(after)))
  return json({code:'INVALID_CURSOR'},400)
 // 5 full payload/result pairs per page bound worst-case D1 batch sizes.
 const {results}=await env.DB.prepare(
  'SELECT id,track_id,exam_section,payload_json,result_json,created_at '+
  'FROM mock_exam_submissions WHERE id>? ORDER BY id LIMIT 6')
  .bind(after).all<OldRow>()
 const rows=results||[],page=rows.slice(0,5)
 const valid=page.map(normalized)
 // No partial import or cursor advancement when one record needs review.
 if(valid.some(x=>x===null))
  return json({code:'LEGACY_MOCK_RECEIPT_REVIEW_REQUIRED'},409)
 if(!page.length)return json({ok:true,scope:'owner_only',adopted:0,
  has_more:false,next_cursor:null,legacy_changed:false})
 const checked=valid as TargetRow[]
 const ids=checked.map(row=>row.id)
 const existing=(await env.DB.prepare(
  'SELECT id,track_id,exam_section,study_date,payload_json,result_json,created_at '+
  'FROM homeflow_mock_exam_submissions WHERE homeflow_user_id=? '+
  'AND id IN ('+ids.map(()=>'?').join(',')+')')
  .bind(actor.user_id,...ids).all<TargetRow>()).results||[]
 const targets=new Map(existing.map(row=>[row.id,row]))
 for(const row of checked){
  const target=targets.get(row.id)
  if(target&&(['track_id','exam_section','study_date','payload_json',
   'result_json','created_at'] as const).some(k=>target[k]!==row[k]))
   return json({code:'MOCK_RECEIPT_CONFLICT',submission_id:row.id},409)
 }
 const newRows=checked.filter(row=>!targets.has(row.id))
 if(newRows.length){
  const statements:D1PreparedStatement[]=[]
  for(const row of newRows){
   const fingerprint=await hash(row.payload_json),resultHash=await hash(row.result_json)
   statements.push(env.DB.prepare('INSERT INTO homeflow_mock_exam_submissions '+
    '(homeflow_user_id,id,track_id,exam_section,study_date,payload_json,result_json,created_at) '+
    'VALUES(?,?,?,?,?,?,?,?)')
    .bind(actor.user_id,row.id,row.track_id,row.exam_section,row.study_date,
     row.payload_json,row.result_json,row.created_at))
   statements.push(env.DB.prepare('INSERT INTO homeflow_mock_legacy_adoptions '+
    '(event_id,actor_user_id,original_submission_id,payload_sha256,result_sha256) '+
    'VALUES(?,?,?,?,?)')
    .bind(eventId(),actor.user_id,row.id,fingerprint,resultHash))
  }
  try{
   const writes=await env.DB.batch(statements)
   if(writes.some((x,i)=>x.meta?.changes!==1))
    return json({code:'LEGACY_MOCK_ADOPTION_CONFLICT'},409)
  }catch{
   // A concurrent same-ID submission aborts the full atomic batch. Never
   // silently ignore a mismatched newer receipt.
   return json({code:'LEGACY_MOCK_ADOPTION_CONFLICT'},409)
  }
 }
 return json({ok:true,scope:'owner_only',adopted:newRows.length,
  skipped_identical:page.length-newRows.length,
  has_more:rows.length>5,
  next_cursor:rows.length>5?page.at(-1)?.id:null,legacy_changed:false})
}
export async function homeflowMockReceipts(req:Request,env:Env):Promise<Response>{
 const url=new URL(req.url)
 const enabled=homeflowStudyReady(env,url)&&
  env.HOMEFLOW_STUDY_EXAMS_ENABLED==='true'&&env.HOMEFLOW_STUDY_MOCK_ENABLED==='true'
 if(!enabled)return json({code:'STUDY_MOCK_DISABLED'},503)
 try{
  const actor=await verifiedStudyActor(req,env)
  if(!actor)return json({code:'SSO_NOT_AUTHENTICATED'},401)
  if(url.pathname==='/api/homeflow-study/exams/mock/receipts'&&req.method==='GET')
   return list(env,actor,url)
  if(url.pathname==='/api/homeflow-study/exams/mock/receipt'&&req.method==='GET')
   return detail(env,actor,url)
  if(url.pathname==='/api/homeflow-study/exams/mock/legacy/adopt'&&req.method==='POST')
   return adopt(req,env,url,actor)
  return json({code:'NOT_FOUND'},404)
 }catch{return json({code:'MOCK_RECEIPT_UNAVAILABLE'},503)}
}
