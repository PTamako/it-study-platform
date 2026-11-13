// Stage E independent authenticated study attempts, review and exam history.
// No HomeFlow cookie may authorize any legacy single-user exam APIs.
import {verifiedStudyActor,homeflowStudyReady} from './homeflow-identity'

type Env={DB:D1Database;APP_ENV?:string;HOMEFLOW_STUDY_SSO_ENABLED?:string;
 HOMEFLOW_STUDY_EXAMS_ENABLED?:string;STUDY_PUBLIC_ORIGIN?:string;
 HOMEFLOW_OAUTH_ORIGIN?:string;STUDY_SSO_ENCRYPTION_KEY?:string;
 HOMEFLOW_STUDY_SERVICE?:Fetcher}
type Actor={user_id:string;household_id:string;role:'owner'|'member'}
type JsonObject=Record<string,unknown>
const json=(x:unknown,status=200)=>new Response(JSON.stringify(x),{status,headers:{
 'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',
 'X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'}})
const id=()=>Array.from(crypto.getRandomValues(new Uint8Array(16)),
 b=>b.toString(16).padStart(2,'0')).join('')
const sha=async(s:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',
 new TextEncoder().encode(s))),b=>b.toString(16).padStart(2,'0')).join('')
const uuid=(x:unknown):x is string=>typeof x==='string'&&
 /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(x)
const textId=(x:unknown):x is string=>typeof x==='string'&&
 x.length>0&&x.length<=120&&x.trim()===x
const safeDate=(x:unknown):x is string=>{
 if(typeof x!=='string'||!/^20[0-9]{2}-[0-9]{2}-[0-9]{2}$/.test(x))return false
 const date=new Date(x+'T00:00:00Z')
 return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===x
}
const track=(x:unknown)=>x==='exam-sg'||x==='exam-fe'
const keyOnly=(x:JsonObject,keys:string[])=>Object.keys(x).every(k=>keys.includes(k))
async function body(req:Request,url:URL){
 if(req.headers.get('origin')!==url.origin||
  req.headers.get('content-type')?.split(';')[0].trim().toLowerCase()!=='application/json')return null
 try{
  const s=await req.text()
  if(s.length>3600)return null
  const parsed=JSON.parse(s) as unknown
  return parsed&&typeof parsed==='object'&&!Array.isArray(parsed)?parsed as JsonObject:null
 }catch{return null}
}
async function question(env:Env,questionId:string){
 return env.DB.prepare('SELECT id,track_id,answer_json,question_type FROM questions WHERE id=?')
  .bind(questionId).first<{id:string;track_id:string;answer_json:string;question_type:string}>()
}
async function progress(env:Env,actor:Actor,questionId:string){
 return env.DB.prepare('SELECT question_id,track_id,review_count,correct_streak,last_result,'+
  'next_review_at,mastered,version FROM homeflow_question_review_state '+
  'WHERE homeflow_user_id=? AND question_id=?')
  .bind(actor.user_id,questionId).first()
}
async function questions(env:Env,actor:Actor,url:URL){
 const t=url.searchParams.get('track')||'exam-sg'
 const after=url.searchParams.get('after')||''
 const limit=Number(url.searchParams.get('limit')||15)
 if(!track(t))return json({code:'INVALID_TRACK'},400)
 if(after&&!textId(after))return json({code:'INVALID_CURSOR'},400)
 if(!Number.isSafeInteger(limit)||limit<1||limit>30)
  return json({code:'INVALID_LIMIT'},400)
 const data=await env.DB.prepare(
  'SELECT q.id,q.track_id,q.topic,q.difficulty,q.question_type,q.prompt,q.options_json,'+
  'COALESCE(s.review_count,0) AS review_count,COALESCE(s.mastered,0) AS mastered,'+
  'COALESCE(s.correct_streak,0) AS correct_streak,s.next_review_at,'+
  '(SELECT COUNT(*) FROM homeflow_study_attempts a '+
  'WHERE a.homeflow_user_id=? AND a.question_id=q.id AND a.is_correct=0) AS wrong_count '+
  'FROM questions q LEFT JOIN homeflow_question_review_state s ON '+
  's.homeflow_user_id=? AND s.question_id=q.id '+
  "WHERE q.track_id=? AND q.question_type='single_choice' AND q.id>? "+
  'ORDER BY q.id LIMIT ?')
  .bind(actor.user_id,actor.user_id,t,after,limit+1).all<JsonObject>()
 const rows=data.results||[],part=rows.slice(0,limit)
 return json({ok:true,scope:'user',track:t,items:part.map(r=>({
  id:r.id,track_id:r.track_id,topic:r.topic,difficulty:r.difficulty,
  question_type:r.question_type,prompt:r.prompt,
  options:JSON.parse(String(r.options_json||'[]')),review_count:r.review_count,
  correct_streak:r.correct_streak,mastered:r.mastered===1,
  next_review_at:r.next_review_at,wrong_count:r.wrong_count
 })),next_cursor:rows.length>limit?part.at(-1)?.id:null})
}
type SavedAttempt={question_id:string;user_answer_json:string;is_correct:number}
async function getSaved(env:Env,actor:Actor,attemptId:string){
 return env.DB.prepare('SELECT question_id,user_answer_json,is_correct '+
  'FROM homeflow_study_attempts WHERE homeflow_user_id=? AND id=?')
  .bind(actor.user_id,attemptId).first<SavedAttempt>()
}
async function attempt(req:Request,env:Env,url:URL,actor:Actor){
 const data=await body(req,url)
 if(!data)return json({code:'BAD_ORIGIN_OR_BODY'},403)
 if(!keyOnly(data,['attempt_id','question_id','answer','duration_seconds'])||
  !uuid(data.attempt_id)||!textId(data.question_id)||
  typeof data.answer!=='string'||data.answer.length<1||data.answer.length>10||
  typeof data.duration_seconds!=='number'||!Number.isSafeInteger(data.duration_seconds)||
  data.duration_seconds<0||data.duration_seconds>86400)
  return json({code:'INVALID_ATTEMPT'},400)
 const attemptId=data.attempt_id,questionId=data.question_id,answer=data.answer
 const serialized=JSON.stringify(answer)
 const existing=await getSaved(env,actor,attemptId)
 if(existing){
  if(existing.question_id!==questionId||existing.user_answer_json!==serialized)
   return json({code:'ATTEMPT_ID_REUSED'},409)
  const q=await question(env,questionId)
  return json({ok:true,replayed:true,scope:'user',attempt_id:attemptId,
   correct:existing.is_correct===1,answer:q?JSON.parse(q.answer_json):null,
   progress:await progress(env,actor,questionId)})
 }
 const q=await question(env,questionId)
 if(!q||q.question_type!=='single_choice'||!track(q.track_id))
  return json({code:'QUESTION_NOT_FOUND'},404)
 let expected:unknown
 try{expected=JSON.parse(q.answer_json)}
 catch{return json({code:'QUESTION_ANSWER_REVIEW_REQUIRED'},409)}
 if(typeof expected!=='string')return json({code:'QUESTION_ANSWER_REVIEW_REQUIRED'},409)
 const correct=expected===answer,grade=correct?'remembered':'again'
 const stamp=new Date().toISOString()
 try{
  await env.DB.batch([
   env.DB.prepare('INSERT INTO homeflow_study_attempts '+
    '(homeflow_user_id,id,question_id,user_answer_json,is_correct,duration_seconds,answered_at) '+
    'VALUES(?,?,?,?,?,?,?)')
    .bind(actor.user_id,attemptId,questionId,serialized,correct?1:0,data.duration_seconds,stamp),
   env.DB.prepare('INSERT INTO homeflow_question_review_state '+
    '(homeflow_user_id,question_id,track_id,review_count,correct_streak,last_result,'+
    'next_review_at,mastered,version,updated_by_user_id,updated_at) '+
    'VALUES(?,?,?,1,?,?,datetime(CURRENT_TIMESTAMP,?),0,1,?,?) '+
    'ON CONFLICT(homeflow_user_id,question_id) DO UPDATE SET '+
    'review_count=homeflow_question_review_state.review_count+1,'+
    "correct_streak=CASE WHEN excluded.last_result='remembered' "+
    'THEN homeflow_question_review_state.correct_streak+1 ELSE 0 END,'+
    'last_result=excluded.last_result,'+
    'next_review_at=datetime(CURRENT_TIMESTAMP,CASE '+
    "WHEN excluded.last_result='again' THEN '+10 minutes' "+
    "WHEN homeflow_question_review_state.correct_streak+1>=3 THEN '+30 days' "+
    "WHEN homeflow_question_review_state.correct_streak+1=2 THEN '+3 days' ELSE '+1 day' END),"+
    "mastered=CASE WHEN excluded.last_result='remembered' AND "+
    'homeflow_question_review_state.correct_streak+1>=3 THEN 1 ELSE 0 END,'+
    'track_id=excluded.track_id,version=homeflow_question_review_state.version+1,'+
    'updated_by_user_id=excluded.updated_by_user_id,updated_at=excluded.updated_at')
    .bind(actor.user_id,questionId,q.track_id,correct?1:0,grade,
     correct?'+1 day':'+10 minutes',actor.user_id,stamp),
   env.DB.prepare('INSERT INTO homeflow_exam_events(event_id,actor_user_id,action,reference_sha256,affected_count,created_at) '+
    "VALUES(?,?,'attempt',?,1,?)").bind(id(),actor.user_id,
      await sha(attemptId),stamp)
  ])
 }catch{
  const retry=await getSaved(env,actor,attemptId)
  if(retry&&retry.question_id===questionId&&retry.user_answer_json===serialized)
   return json({ok:true,replayed:true,scope:'user',attempt_id:attemptId,
    correct:retry.is_correct===1,answer:expected,
    progress:await progress(env,actor,questionId)})
  if(retry)return json({code:'ATTEMPT_ID_REUSED'},409)
  return json({code:'ATTEMPT_WRITE_UNAVAILABLE'},503)
 }
 return json({ok:true,replayed:false,scope:'user',attempt_id:attemptId,
  correct,answer:expected,progress:await progress(env,actor,questionId)},201)
}
async function wrong(env:Env,actor:Actor,url:URL){
 const t=url.searchParams.get('track')||'exam-sg'
 const after=url.searchParams.get('after')||''
 const limit=Number(url.searchParams.get('limit')||20)
 if(!track(t))return json({code:'INVALID_TRACK'},400)
 if(after&&!textId(after))return json({code:'INVALID_CURSOR'},400)
 if(!Number.isSafeInteger(limit)||limit<1||limit>30)return json({code:'INVALID_LIMIT'},400)
 const {results}=await env.DB.prepare(
  'SELECT q.id,q.track_id,q.topic,q.prompt,q.options_json,q.explanation,'+
  'q.answer_json,COALESCE(s.review_count,0) review_count,'+
  'COALESCE(s.mastered,0) mastered,s.next_review_at,'+
  '(SELECT COUNT(*) FROM homeflow_study_attempts wa WHERE wa.homeflow_user_id=? '+
  'AND wa.question_id=q.id AND wa.is_correct=0) wrong_count '+
  'FROM questions q LEFT JOIN homeflow_question_review_state s ON '+
  's.homeflow_user_id=? AND s.question_id=q.id '+
  "WHERE q.track_id=? AND q.id>? AND q.question_type='single_choice' "+
  'AND EXISTS(SELECT 1 FROM homeflow_study_attempts a WHERE a.homeflow_user_id=? '+
  'AND a.question_id=q.id AND a.is_correct=0) '+
  'ORDER BY q.id LIMIT ?')
  .bind(actor.user_id,actor.user_id,t,after,actor.user_id,limit+1).all<JsonObject>()
 const rows=results||[],part=rows.slice(0,limit)
 return json({ok:true,scope:'user',track:t,items:part.map(row=>({
  id:row.id,track_id:row.track_id,topic:row.topic,prompt:row.prompt,
  options:JSON.parse(String(row.options_json)),answer:JSON.parse(String(row.answer_json)),
  explanation:row.explanation,review_count:row.review_count,mastered:row.mastered===1,
  next_review_at:row.next_review_at,wrong_count:row.wrong_count
 })),next_cursor:rows.length>limit?part.at(-1)?.id:null})
}
async function history(env:Env,actor:Actor,url:URL){
 const after=url.searchParams.get('after')||''
 const limit=Number(url.searchParams.get('limit')||20)
 if(after&&!/^[a-zA-Z0-9_-]{8,80}$/.test(after))return json({code:'INVALID_CURSOR'},400)
 if(!Number.isSafeInteger(limit)||limit<1||limit>40)return json({code:'INVALID_LIMIT'},400)
 const {results}=await env.DB.prepare(
  'SELECT id,study_date AS date,exam_name AS exam,question_count AS total,'+
  'correct_count AS correct,created_at FROM homeflow_exam_history '+
  'WHERE homeflow_user_id=? AND id>? ORDER BY id LIMIT ?')
  .bind(actor.user_id,after,limit+1).all<JsonObject>()
 const part=(results||[]).slice(0,limit)
 return json({ok:true,scope:'user',items:part,
  next_cursor:(results||[]).length>limit?part.at(-1)?.id:null})
}
async function addHistory(req:Request,env:Env,url:URL,actor:Actor){
 const data=await body(req,url)
 if(!data)return json({code:'BAD_ORIGIN_OR_BODY'},403)
 if(!keyOnly(data,['id','date','exam','total','correct'])||
  typeof data.id!=='string'||!/^[a-zA-Z0-9_-]{8,80}$/.test(data.id)||
  !safeDate(data.date)||typeof data.exam!=='string'||
  data.exam.trim()!==data.exam||data.exam.length<1||data.exam.length>100||
  !Number.isSafeInteger(data.total)||Number(data.total)<1||Number(data.total)>10000||
  !Number.isSafeInteger(data.correct)||Number(data.correct)<0||
  Number(data.correct)>Number(data.total))return json({code:'INVALID_HISTORY'},400)
 const existing=await env.DB.prepare('SELECT study_date,exam_name,question_count,correct_count '+
  'FROM homeflow_exam_history WHERE homeflow_user_id=? AND id=?')
  .bind(actor.user_id,data.id).first<{study_date:string;exam_name:string;
   question_count:number;correct_count:number}>()
 const same=(x:typeof existing)=>x?.study_date===data.date&&x.exam_name===data.exam&&
  x.question_count===data.total&&x.correct_count===data.correct
 if(existing)return same(existing)?json({ok:true,replayed:true,id:data.id,scope:'user'}):
  json({code:'HISTORY_ID_REUSED'},409)
 try{
  await env.DB.batch([
   env.DB.prepare('INSERT INTO homeflow_exam_history '+
    '(homeflow_user_id,id,study_date,exam_name,question_count,correct_count) '+
    'VALUES(?,?,?,?,?,?)')
    .bind(actor.user_id,data.id,data.date,data.exam,data.total,data.correct),
   env.DB.prepare('INSERT INTO homeflow_exam_events '+
    '(event_id,actor_user_id,action,reference_sha256,affected_count) '+
    "VALUES(?,?,'history_added',?,1)")
    .bind(id(),actor.user_id,await sha(data.id))
  ])
 }catch{
  const retry=await env.DB.prepare('SELECT study_date,exam_name,question_count,correct_count '+
    'FROM homeflow_exam_history WHERE homeflow_user_id=? AND id=?')
    .bind(actor.user_id,data.id).first<typeof existing>()
  if(retry)return same(retry)?json({ok:true,replayed:true,id:data.id,scope:'user'}):
    json({code:'HISTORY_ID_REUSED'},409)
  return json({code:'HISTORY_WRITE_UNAVAILABLE'},503)
 }
 return json({ok:true,replayed:false,id:data.id,scope:'user'},201)
}
// Adopt old *owner-only* rows, never delete or update the source tables.
// JSON1 embeds precisely the prevalidated page snapshot; no ignored corrupt
// source row can be silently omitted while advancing the cursor.
async function adopt(req:Request,env:Env,url:URL,actor:Actor){
 if(actor.role!=='owner')return json({code:'ONLY_ORIGINAL_OWNER'},403)
 const data=await body(req,url)
 if(!data||data.confirm!==true||!keyOnly(data,['confirm','kind','after'])||
  !['attempts','reviews','history'].includes(String(data.kind)))
  return json({code:'CONFIRM_REQUIRED'},403)
 const kind=String(data.kind) as 'attempts'|'reviews'|'history'
 const after=data.after===undefined?'':data.after
 if(typeof after!=='string'||after.length>(kind==='attempts'?240:120)||
  (after!==''&&(kind==='attempts'||kind==='history'?
   !/^[a-zA-Z0-9_:-]{8,240}$/.test(after):!textId(after))))
  return json({code:'INVALID_CURSOR'},400)
 const table=kind==='attempts'?'study_attempts':
  kind==='reviews'?'question_review_state':'exam_history'
 const key=kind==='attempts'||kind==='history'?'id':'question_id'
 const rows=(await env.DB.prepare('SELECT * FROM '+table+' WHERE '+key+'>? ORDER BY '+key+' LIMIT 21')
  .bind(after).all<JsonObject>()).results||[]
 const page=rows.slice(0,20)
 const valid=page.every(row=>{
  if(kind==='attempts'){
   try{
    const decoded=JSON.parse(String(row.user_answer_json))
    return typeof row.id==='string'&&row.id.length>=8&&row.id.length<=240&&
     textId(row.question_id)&&typeof row.user_answer_json==='string'&&
     decoded!==undefined&&(row.is_correct===0||row.is_correct===1)&&
     Number.isSafeInteger(row.duration_seconds)&&Number(row.duration_seconds)>=0&&
     Number(row.duration_seconds)<=86400&&typeof row.answered_at==='string'
   }catch{return false}
  }
  if(kind==='reviews')return textId(row.question_id)&&
   track(row.track_id)&&Number.isSafeInteger(row.review_count)&&
   Number(row.review_count)>=0&&Number.isSafeInteger(row.correct_streak)&&
   Number(row.correct_streak)>=0&&Number(row.correct_streak)<=Number(row.review_count)&&
   ['again','remembered'].includes(String(row.last_result))&&
   (row.mastered===0||row.mastered===1)&&
   typeof row.next_review_at==='string'&&typeof row.updated_at==='string'
  return typeof row.id==='string'&&row.id.length>=8&&row.id.length<=120&&
   safeDate(row.study_date)&&typeof row.exam_name==='string'&&
   row.exam_name.length>0&&row.exam_name.length<=100&&
   Number.isSafeInteger(row.question_count)&&Number(row.question_count)>0&&
   Number(row.question_count)<=10000&&Number.isSafeInteger(row.correct_count)&&
   Number(row.correct_count)>=0&&Number(row.correct_count)<=Number(row.question_count)&&
   typeof row.created_at==='string'
 })
 if(!valid)return json({code:'LEGACY_EXAM_REVIEW_REQUIRED'},409)
 if(!page.length)return json({ok:true,kind,adopted:0,has_more:false,
  next_cursor:null,scope:'owner_only',legacy_changed:false})
 const snapshot=JSON.stringify(page),stamp=new Date().toISOString()
 const sql=kind==='attempts'?
  'INSERT OR IGNORE INTO homeflow_study_attempts '+
   '(homeflow_user_id,id,question_id,user_answer_json,is_correct,duration_seconds,answered_at) '+
   'SELECT ?,json_extract(value,\'$.id\'),json_extract(value,\'$.question_id\'),'+
   'json_extract(value,\'$.user_answer_json\'),json_extract(value,\'$.is_correct\'),'+
   'json_extract(value,\'$.duration_seconds\'),json_extract(value,\'$.answered_at\') '+
   'FROM json_each(?)':
 kind==='reviews'?
  'INSERT OR IGNORE INTO homeflow_question_review_state '+
   '(homeflow_user_id,question_id,track_id,review_count,correct_streak,last_result,'+
   'next_review_at,mastered,version,updated_by_user_id,updated_at) '+
   'SELECT ?,json_extract(value,\'$.question_id\'),json_extract(value,\'$.track_id\'),'+
   'json_extract(value,\'$.review_count\'),json_extract(value,\'$.correct_streak\'),'+
   'json_extract(value,\'$.last_result\'),json_extract(value,\'$.next_review_at\'),'+
   'json_extract(value,\'$.mastered\'),1,?,json_extract(value,\'$.updated_at\') '+
   'FROM json_each(?)':
  'INSERT OR IGNORE INTO homeflow_exam_history '+
   '(homeflow_user_id,id,study_date,exam_name,question_count,correct_count,created_at) '+
   'SELECT ?,json_extract(value,\'$.id\'),json_extract(value,\'$.study_date\'),'+
   'json_extract(value,\'$.exam_name\'),json_extract(value,\'$.question_count\'),'+
   'json_extract(value,\'$.correct_count\'),json_extract(value,\'$.created_at\') '+
   'FROM json_each(?)'
 const stmt=kind==='reviews'?env.DB.prepare(sql).bind(actor.user_id,actor.user_id,snapshot):
  env.DB.prepare(sql).bind(actor.user_id,snapshot)
 try{
  const writes=await env.DB.batch([
   stmt,
   env.DB.prepare('INSERT INTO homeflow_exam_events '+
    '(event_id,actor_user_id,action,reference_sha256,affected_count,created_at) '+
    'SELECT ?,?,?,NULL,changes(),? WHERE changes()>0')
    .bind(id(),actor.user_id,'legacy_'+kind+'_adopted',stamp)
  ])
  const changed=writes[0]?.meta?.changes??-1
  if(changed<0||changed>20||writes[1]?.meta?.changes!==(changed>0?1:0))
   return json({code:'LEGACY_ADOPT_CONFLICT'},409)
  return json({ok:true,kind,adopted:changed,has_more:rows.length>20,
   next_cursor:rows.length>20?page.at(-1)?.[key]:null,
   scope:'owner_only',legacy_changed:false})
 }catch{return json({code:'LEGACY_ADOPT_UNAVAILABLE'},503)}
}
export async function homeflowExams(req:Request,env:Env):Promise<Response>{
 const url=new URL(req.url)
 const enabled=homeflowStudyReady(env,url)&&env.HOMEFLOW_STUDY_EXAMS_ENABLED==='true'
 if(url.pathname==='/api/homeflow-study/exams/status'&&req.method==='GET')
  return json({enabled,scope:'user',legacy_access:false})
 if(!enabled)return json({code:'STUDY_EXAMS_DISABLED'},503)
 try{
  const actor=await verifiedStudyActor(req,env)
  if(!actor)return json({code:'SSO_NOT_AUTHENTICATED'},401)
  if(url.pathname==='/api/homeflow-study/exams/questions'&&req.method==='GET')
   return questions(env,actor,url)
  if(url.pathname==='/api/homeflow-study/exams/attempts'&&req.method==='POST')
   return attempt(req,env,url,actor)
  if(url.pathname==='/api/homeflow-study/exams/wrong'&&req.method==='GET')
   return wrong(env,actor,url)
  if(url.pathname==='/api/homeflow-study/exams/history'){
   if(req.method==='GET')return history(env,actor,url)
   if(req.method==='POST')return addHistory(req,env,url,actor)
  }
  if(url.pathname==='/api/homeflow-study/exams/legacy/adopt'&&req.method==='POST')
   return adopt(req,env,url,actor)
  return json({code:'NOT_FOUND'},404)
 }catch{return json({code:'STUDY_EXAMS_UNAVAILABLE'},503)}
}
