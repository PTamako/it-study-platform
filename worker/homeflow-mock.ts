// Stage E: independent per-HomeFlow-person official-style SG/FE mock exams.
// Original single-user /api/mock-exam-questions and /api/mock-exam/submit are
// untouched; this handler never grants that legacy auth.
import {verifiedStudyActor,homeflowStudyReady} from './homeflow-identity'

type Env={DB:D1Database;APP_ENV?:string;HOMEFLOW_STUDY_SSO_ENABLED?:string;
 HOMEFLOW_STUDY_EXAMS_ENABLED?:string;HOMEFLOW_STUDY_MOCK_ENABLED?:string;
 STUDY_PUBLIC_ORIGIN?:string;HOMEFLOW_OAUTH_ORIGIN?:string;
 STUDY_SSO_ENCRYPTION_KEY?:string;HOMEFLOW_STUDY_SERVICE?:Fetcher}
type Actor={user_id:string;household_id:string;role:'owner'|'member'}
type Pool={section:'A'|'B';count:number;explicit?:boolean;topic?:string}
type Question={id:string;track_id:string;topic:string;exam_section:string;
 answer_json:string;explanation:string}
type Answer={question_id:string;answer:string}
const json=(v:unknown,status=200)=>new Response(JSON.stringify(v),{status,headers:{
 'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',
 'X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'}})
const eventId=()=>Array.from(crypto.getRandomValues(new Uint8Array(16)),
 x=>x.toString(16).padStart(2,'0')).join('')
const hash=async(s:string)=>Array.from(new Uint8Array(
 await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s))),
 x=>x.toString(16).padStart(2,'0')).join('')
const uuid=(x:unknown):x is string=>typeof x==='string'&&
 /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(x)
function safeDate(x:unknown):x is string{
 if(typeof x!=='string'||!/^20[0-9]{2}-[0-9]{2}-[0-9]{2}$/.test(x))return false
 const d=new Date(x+'T00:00:00Z')
 return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===x
}
function target(t:unknown,s:unknown):{track:'exam-sg'|'exam-fe';section:'SG'|'A'|'B';count:number}|null{
 if(t==='exam-sg'&&s==='SG')return {track:'exam-sg',section:'SG',count:60}
 if(t==='exam-fe'&&s==='A')return {track:'exam-fe',section:'A',count:60}
 if(t==='exam-fe'&&s==='B')return {track:'exam-fe',section:'B',count:20}
 return null
}
function pools(t:{track:string;section:string}):Pool[]{
 if(t.track==='exam-sg')return [{section:'A',count:48},{section:'B',count:12}]
 if(t.section==='A')return [{section:'A',count:60,explicit:true}]
 return [{section:'B',count:16,explicit:true,topic:'FE算法与程序设计'},
  {section:'B',count:4,explicit:true,topic:'FE信息安全'}]
}
// Trusted, reviewed IPA FE sample aliases from the old production mock logic.
function sampleAliases(topic:string){
 return topic==='FE信息安全'?
  ['fe-ipa-sample-2022-april-b-006',...Array.from({length:4},(_,i)=>
   'fe-ipa-sample-2022-b-'+String(i+17).padStart(3,'0'))]:
  topic==='FE算法与程序设计'?
  [...Array.from({length:5},(_,i)=>
    'fe-ipa-sample-2022-april-b-'+String(i+1).padStart(3,'0')),
   ...Array.from({length:16},(_,i)=>
    'fe-ipa-sample-2022-b-'+String(i+1).padStart(3,'0'))]:[]
}
function where(track:string,p:Pool){
 const aliases=p.topic?sampleAliases(p.topic):[]
 return {
  sql:'p.track_id=? AND p.exam_section=?'+
   (track==='exam-sg'?" AND p.question_id <> 'sg-official-h29a-2017-q31'":'')+
   (p.explicit?" AND p.exam_section_method='explicit'":'')+
   (p.topic?' AND (p.topic=? OR (p.question_kind=\'official_sample\' AND '+
    'p.question_id IN ('+aliases.map(()=>'?').join(',')+')))':''),
  args:[track,p.section,...(p.topic?[p.topic,...aliases]:[])]
 }
}
async function draw(env:Env,track:string,p:Pool){
 const condition=where(track,p),pivot=Math.floor(Math.random()*2147483648)
 const base='SELECT q.id,q.track_id,q.topic,q.difficulty,q.question_type,'+
  'q.prompt,q.options_json,q.source_type,q.exam_section '+
  'FROM mock_question_pool p JOIN questions q ON q.id=p.question_id '+
  'WHERE '+condition.sql+' AND p.draw_key '
 async function fetchWindow(op:'>='|'<',limit:number){
  const result=await env.DB.prepare(base+op+'? ORDER BY p.draw_key,p.question_id LIMIT ?')
   .bind(...condition.args,pivot,limit).all<Record<string,unknown>>()
  return result.results||[]
 }
 const first=await fetchWindow('>=',p.count)
 if(first.length>=p.count)return first
 return [...first,...await fetchWindow('<',p.count-first.length)]
}
function shuffled<T>(arr:T[]){
 const result=[...arr]
 for(let i=result.length-1;i>0;i--){
  const j=Math.floor(Math.random()*(i+1))
  ;[result[i],result[j]]=[result[j],result[i]]
 }
 return result
}
async function paper(env:Env,actor:Actor,url:URL){
 const input=target(url.searchParams.get('track')||'exam-sg',
  url.searchParams.get('section')||'SG')
 if(!input)return json({code:'MOCK_FORMAT_UNSUPPORTED'},400)
 const groups=pools(input)
 const results=await Promise.all(groups.map(p=>draw(env,input.track,p)))
 if(groups.some((p,i)=>results[i].length!==p.count))
  return json({code:'MOCK_POOL_INSUFFICIENT',section_counts:Object.fromEntries(
   groups.map((p,i)=>[p.topic||p.section,results[i].length]))},409)
 const rows=shuffled(results.flat())
 // Important: no q.answer_json / explanation in query or response pre-submit.
 return json({ok:true,scope:'user',track:input.track,section:input.section,
  total:input.count,duration_minutes:input.section==='SG'?120:input.section==='A'?90:100,
  items:rows.map(r=>({id:r.id,track_id:r.track_id,topic:r.topic,
   difficulty:r.difficulty,question_type:r.question_type,prompt:r.prompt,
   options:JSON.parse(String(r.options_json||'[]')),
   source_type:r.source_type,exam_section:r.exam_section}))})
}
async function receipt(env:Env,actor:Actor,submissionId:string){
 return env.DB.prepare('SELECT payload_json,result_json FROM homeflow_mock_exam_submissions '+
  'WHERE homeflow_user_id=? AND id=?')
  .bind(actor.user_id,submissionId).first<{payload_json:string;result_json:string}>()
}
async function submit(req:Request,env:Env,url:URL,actor:Actor){
 if(req.headers.get('origin')!==url.origin||
  req.headers.get('content-type')?.split(';')[0].trim().toLowerCase()!=='application/json')
  return json({code:'BAD_ORIGIN_OR_BODY'},403)
 let v:Record<string,unknown>
 try{
  const text=await req.text()
  if(text.length>32000)return json({code:'MOCK_PAYLOAD_TOO_LARGE'},413)
  const obj=JSON.parse(text)
  if(!obj||typeof obj!=='object'||Array.isArray(obj))throw Error('bad')
  v=obj as Record<string,unknown>
 }catch{return json({code:'INVALID_MOCK_BODY'},400)}
 const format=target(v.track,v.section)
 if(!format||!uuid(v.submission_id)||!safeDate(v.study_date)||
  typeof v.duration_seconds!=='number'||!Number.isSafeInteger(v.duration_seconds)||
  v.duration_seconds<0||v.duration_seconds>86400||
  !Array.isArray(v.answers)||v.answers.length!==format.count||
  v.answers.some(x=>!x||typeof x!=='object'||typeof x.question_id!=='string'||
   x.question_id.length<1||x.question_id.length>120||!x.question_id.trim()||
   typeof x.answer!=='string'||x.answer.length>10))
  return json({code:'INVALID_MOCK_SUBMISSION'},400)
 if(Object.keys(v).some(k=>!['submission_id','track','section','study_date',
  'duration_seconds','answers'].includes(k)))return json({code:'INVALID_MOCK_SUBMISSION'},400)
 const answers=v.answers as Answer[],ids=answers.map(x=>x.question_id)
 if(new Set(ids).size!==format.count)return json({code:'MOCK_DUPLICATE_QUESTION'},400)
 const submissionId=v.submission_id,track=format.track,section=format.section
 const payload=JSON.stringify({track,section,date:v.study_date,duration:v.duration_seconds,
  answers})
 const previous=await receipt(env,actor,submissionId)
 if(previous)return previous.payload_json===payload?
  json(JSON.parse(previous.result_json)):
  json({code:'MOCK_SUBMISSION_ID_REUSED'},409)
 const marks=ids.map(()=>'?').join(',')
 const result=await env.DB.prepare(
  'SELECT id,track_id,topic,exam_section,answer_json,explanation FROM questions '+
  'WHERE id IN ('+marks+')').bind(...ids).all<Question>()
 const rows=result.results||[]
 if(rows.length!==format.count||rows.some(r=>r.track_id!==track))
  return json({code:'MOCK_QUESTION_SET_CHANGED'},409)
 const a=rows.filter(x=>x.exam_section==='A').length
 const b=rows.filter(x=>x.exam_section==='B').length
 const distribution=track==='exam-sg'?a===48&&b===12:
  section==='A'?a===60&&b===0:
  a===0&&b===20&&rows.filter(x=>x.topic==='FE算法与程序设计').length===16&&
   rows.filter(x=>x.topic==='FE信息安全').length===4
 if(!distribution)return json({code:'MOCK_SECTION_DISTRIBUTION_INVALID'},409)
 const byId=new Map(rows.map(r=>[r.id,r]))
 let graded:Array<{id:string;answer:string;correct:number}>,review:Array<{
  id:string;answer:string;explanation:string}>
 try{
  graded=answers.map(x=>{
   const actual=JSON.parse(byId.get(x.question_id)!.answer_json)
   if(typeof actual!=='string')throw Error('question answer requires review')
   return {id:x.question_id,answer:x.answer,correct:actual===x.answer?1:0}
  })
  review=answers.map(x=>({
   id:x.question_id,answer:JSON.parse(byId.get(x.question_id)!.answer_json),
   explanation:byId.get(x.question_id)!.explanation||''}))
 }catch{return json({code:'MOCK_ANSWER_REVIEW_REQUIRED'},409)}
 const correctCount=graded.filter(x=>x.correct===1).length
 const examName=track==='exam-sg'?'SG 模擬試験':'FE 科目'+section+' 模擬試験'
 const summary={ok:true,scope:'user',submission_id:submissionId,track,section,
  correct_count:correctCount,total:format.count,exam_name:examName,
  study_date:v.study_date,review}
 const gradesJson=JSON.stringify(graded),stamp=new Date().toISOString()
 try{
  await env.DB.batch([
   env.DB.prepare('INSERT INTO homeflow_mock_exam_submissions '+
    '(homeflow_user_id,id,track_id,exam_section,study_date,payload_json,result_json,created_at) '+
    'VALUES(?,?,?,?,?,?,?,?)')
    .bind(actor.user_id,submissionId,track,section,v.study_date,payload,
     JSON.stringify(summary),stamp),
   env.DB.prepare('INSERT INTO homeflow_study_attempts '+
    '(homeflow_user_id,id,question_id,user_answer_json,is_correct,duration_seconds,answered_at) '+
    'SELECT ?,? || \':\' || json_extract(value,\'$.id\'),'+
    'json_extract(value,\'$.id\'),json_quote(json_extract(value,\'$.answer\')),'+
    'CAST(json_extract(value,\'$.correct\') AS INTEGER),?,? FROM json_each(?)')
    .bind(actor.user_id,submissionId,v.duration_seconds,stamp,gradesJson),
   env.DB.prepare('INSERT INTO homeflow_question_review_state '+
    '(homeflow_user_id,question_id,track_id,review_count,correct_streak,last_result,'+
    'next_review_at,mastered,version,updated_by_user_id,updated_at) '+
    'SELECT ?,json_extract(value,\'$.id\'),?,1,'+
    'CAST(json_extract(value,\'$.correct\') AS INTEGER),'+
    "CASE WHEN json_extract(value,'$.correct')=1 THEN 'remembered' ELSE 'again' END,"+
    "datetime(CURRENT_TIMESTAMP,CASE WHEN json_extract(value,'$.correct')=1 "+
    "THEN '+1 day' ELSE '+10 minutes' END),0,1,?,? "+
    'FROM json_each(?) WHERE 1=1 '+
    'ON CONFLICT(homeflow_user_id,question_id) DO UPDATE SET '+
    'track_id=excluded.track_id,'+
    'review_count=homeflow_question_review_state.review_count+1,'+
    "correct_streak=CASE WHEN excluded.last_result='remembered' THEN "+
    'homeflow_question_review_state.correct_streak+1 ELSE 0 END,'+
    'last_result=excluded.last_result,'+
    "next_review_at=datetime(CURRENT_TIMESTAMP,CASE WHEN excluded.last_result='again' "+
    "THEN '+10 minutes' WHEN homeflow_question_review_state.correct_streak+1>=3 "+
    "THEN '+30 days' WHEN homeflow_question_review_state.correct_streak+1=2 "+
    "THEN '+3 days' ELSE '+1 day' END),"+
    "mastered=CASE WHEN excluded.last_result='remembered' AND "+
    'homeflow_question_review_state.correct_streak+1>=3 THEN 1 ELSE 0 END,'+
    'version=homeflow_question_review_state.version+1,'+
    'updated_by_user_id=excluded.updated_by_user_id,updated_at=excluded.updated_at')
    .bind(actor.user_id,track,actor.user_id,stamp,gradesJson),
   env.DB.prepare('INSERT INTO homeflow_exam_history '+
    '(homeflow_user_id,id,study_date,exam_name,question_count,correct_count,created_at) '+
    'VALUES(?,?,?,?,?,?,?)')
    .bind(actor.user_id,submissionId,v.study_date,examName,format.count,correctCount,stamp),
   env.DB.prepare('INSERT INTO homeflow_exam_events '+
    '(event_id,actor_user_id,action,reference_sha256,affected_count,created_at) '+
    "VALUES(?,?,'mock_submitted',?,1,?)")
    .bind(eventId(),actor.user_id,await hash(submissionId),stamp)
  ])
 }catch{
  const committed=await receipt(env,actor,submissionId)
  if(committed)return committed.payload_json===payload?
   json(JSON.parse(committed.result_json)):
   json({code:'MOCK_SUBMISSION_ID_REUSED'},409)
  return json({code:'MOCK_SUBMIT_UNAVAILABLE'},503)
 }
 return json(summary,201)
}
export async function homeflowMockExam(req:Request,env:Env):Promise<Response>{
 const url=new URL(req.url)
 const enabled=homeflowStudyReady(env,url)&&
  env.HOMEFLOW_STUDY_EXAMS_ENABLED==='true'&&env.HOMEFLOW_STUDY_MOCK_ENABLED==='true'
 if(url.pathname==='/api/homeflow-study/exams/mock/status'&&req.method==='GET')
  return json({enabled,scope:'user',legacy_access:false})
 if(!enabled)return json({code:'STUDY_MOCK_DISABLED'},503)
 try{
  const actor=await verifiedStudyActor(req,env)
  if(!actor)return json({code:'SSO_NOT_AUTHENTICATED'},401)
  if(url.pathname==='/api/homeflow-study/exams/mock/questions'&&req.method==='GET')
   return paper(env,actor,url)
  if(url.pathname==='/api/homeflow-study/exams/mock/submit'&&req.method==='POST')
   return submit(req,env,url,actor)
  return json({code:'NOT_FOUND'},404)
 }catch{return json({code:'STUDY_MOCK_UNAVAILABLE'},503)}
}
