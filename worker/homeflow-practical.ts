// Original Zhixue practical training with HomeFlow user-scoped submissions.
// Never unlock legacy /api/scenarios or /api/scenario-attempts from an SSO cookie.
import {verifiedStudyActor,homeflowStudyReady} from './homeflow-identity'
type Env={DB:D1Database;APP_ENV?:string;HOMEFLOW_STUDY_SSO_ENABLED?:string;
 HOMEFLOW_STUDY_EXAMS_ENABLED?:string;STUDY_PUBLIC_ORIGIN?:string;
 HOMEFLOW_OAUTH_ORIGIN?:string;STUDY_SSO_ENCRYPTION_KEY?:string;
 HOMEFLOW_STUDY_SERVICE?:Fetcher}
type Actor={user_id:string;household_id:string;role:'owner'|'member'}
const json=(x:unknown,status=200)=>new Response(JSON.stringify(x),{status,headers:{
 'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',
 'X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'}})
const track=(x:unknown)=>x==='exam-sg'||x==='exam-fe'
const safeId=(x:unknown)=>typeof x==='string'&&/^[a-zA-Z0-9_-]{1,160}$/.test(x)
const attemptId=(x:unknown)=>typeof x==='string'&&
 /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(x)
async function list(env:Env,url:URL,actor:Actor){
 const t=url.searchParams.get('track')||'exam-sg'
 const after=url.searchParams.get('after')||''
 if(!track(t)||after&&!safeId(after))return json({code:'INVALID_FILTER'},400)
 const r=await env.DB.prepare(
  'SELECT id,track_id,title,category,difficulty,situation,task,options_json,source_type,exam_section '+
  'FROM practical_scenarios WHERE track_id=? AND id>? ORDER BY id LIMIT 31'
 ).bind(t,after).all<Record<string,unknown>>()
 const rows=r.results||[],items=rows.slice(0,30)
 return json({ok:true,scope:'user',actor_user_id:actor.user_id,track:t,
  items:items.map(row=>({
   id:row.id,track_id:row.track_id,title:row.title,category:row.category,
   difficulty:row.difficulty,situation:row.situation,task:row.task,
   options:JSON.parse(String(row.options_json||'[]')),
   source_type:row.source_type,exam_section:row.exam_section
  })),
  next_cursor:rows.length>30?items.at(-1)?.id:null})
}
async function submit(req:Request,env:Env,url:URL,actor:Actor){
 if(req.headers.get('origin')!==url.origin||
  req.headers.get('content-type')?.split(';')[0].trim().toLowerCase()!=='application/json')
  return json({code:'BAD_ORIGIN_OR_BODY'},403)
 let body:Record<string,unknown>
 try{const raw=await req.text();if(raw.length>1400)throw Error('too large')
  body=JSON.parse(raw) as Record<string,unknown>
  if(!body||typeof body!=='object'||Array.isArray(body))throw Error('invalid')
 }catch{return json({code:'BAD_REQUEST'},400)}
 if(body.expected_user_id!==actor.user_id)return json({code:'ACTOR_CHANGED'},403)
 if(Object.keys(body).some(k=>!['expected_user_id','attempt_id','scenario_id','selected_option','duration_seconds'].includes(k))||
  !attemptId(body.attempt_id)||!safeId(body.scenario_id)||
  typeof body.selected_option!=='string'||!/^[a-zA-Z0-9]{1,8}$/.test(body.selected_option)||
  !Number.isSafeInteger(body.duration_seconds)||Number(body.duration_seconds)<0||
  Number(body.duration_seconds)>86400)
  return json({code:'INVALID_ATTEMPT'},400)
 const scenario=await env.DB.prepare(
  'SELECT id,track_id,options_json,scoring_json,best_option,explanation FROM practical_scenarios WHERE id=?'
 ).bind(body.scenario_id).first<Record<string,unknown>>()
 if(!scenario||!track(scenario.track_id))return json({code:'SCENARIO_NOT_FOUND'},404)
 const options=JSON.parse(String(scenario.options_json||'[]')) as {id:string;text:string}[]
 const choice=String(body.selected_option)
 if(!options.some(option=>option.id===choice))return json({code:'INVALID_CHOICE'},400)
 const scoring=JSON.parse(String(scenario.scoring_json||'{}')) as Record<string,number>
 const score=Math.max(0,Math.min(100,Math.floor(Number(scoring[choice]??0))))
 await env.DB.prepare(
  'INSERT INTO homeflow_scenario_attempts(homeflow_user_id,id,scenario_id,track_id,selected_option,score,feedback,duration_seconds) '+
  'VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(homeflow_user_id,id) DO NOTHING'
 ).bind(actor.user_id,body.attempt_id,body.scenario_id,scenario.track_id,choice,score,
  String(scenario.explanation||''),body.duration_seconds).run()
 const receipt=await env.DB.prepare(
  'SELECT scenario_id,selected_option,score,feedback FROM homeflow_scenario_attempts '+
  'WHERE homeflow_user_id=? AND id=?'
 ).bind(actor.user_id,body.attempt_id).first<{scenario_id:string;selected_option:string;score:number;feedback:string}>()
 if(!receipt)return json({code:'RECEIPT_UNAVAILABLE'},503)
 if(receipt.scenario_id!==body.scenario_id||receipt.selected_option!==choice)
  return json({code:'ATTEMPT_ID_CONFLICT'},409)
 return json({ok:true,scope:'user',actor_user_id:actor.user_id,
  attempt_id:body.attempt_id,selected_option:choice,score:receipt.score,
  best_option:scenario.best_option,correct:choice===scenario.best_option,
  feedback:receipt.feedback})
}
export async function homeflowPractical(req:Request,env:Env):Promise<Response>{
 const url=new URL(req.url)
 const enabled=homeflowStudyReady(env,url)&&env.HOMEFLOW_STUDY_EXAMS_ENABLED==='true'
 if(url.pathname==='/api/homeflow-study/scenarios/status'&&req.method==='GET')
  return json({enabled,scope:'user',legacy_access:false})
 if(!enabled)return json({code:'STUDY_PRACTICAL_DISABLED'},503)
 try{
  const actor=await verifiedStudyActor(req,env)
  if(!actor)return json({code:'SSO_NOT_AUTHENTICATED'},401)
  if(url.pathname==='/api/homeflow-study/scenarios'){
   if(req.method==='GET')return list(env,url,actor)
   if(req.method==='POST')return submit(req,env,url,actor)
  }
  return json({code:'NOT_FOUND'},404)
 }catch{return json({code:'STUDY_PRACTICAL_UNAVAILABLE'},503)}
}
