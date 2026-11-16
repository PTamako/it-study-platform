// Compatibility data adapter for the ORIGINAL Zhixue App.vue UI.
// No second UI, no access to legacy single-password personal tables.
// Every SQL personal-data query is bound to the verified HttpOnly SSO actor.
import {homeflowStudyReady,verifiedStudyActor} from './homeflow-identity'
type Env={DB:D1Database;APP_ENV?:string;HOMEFLOW_STUDY_SSO_ENABLED?:string;
 HOMEFLOW_STUDY_EXAMS_ENABLED?:string;HOMEFLOW_STUDY_LANGUAGE_ENABLED?:string;
 STUDY_PUBLIC_ORIGIN?:string;HOMEFLOW_OAUTH_ORIGIN?:string;
 STUDY_SSO_ENCRYPTION_KEY?:string;HOMEFLOW_STUDY_SERVICE?:Fetcher}
type Actor={user_id:string;household_id:string;role:'owner'|'member';display_name:string}
type Row=Record<string,unknown>
const json=(x:unknown,status=200)=>new Response(JSON.stringify(x),{status,headers:{
 'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',
 'X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'}})
const track=(v:unknown)=>v==='exam-sg'||v==='exam-fe'
const safeId=(v:unknown)=>typeof v==='string'&&v.length>0&&v.length<=120
const sourceValues=['all','official','generated','licensed','sample','exemption'] as const
const reviewValues=['wrong','due','unlearned','mastered','practice'] as const
const uuid=()=>crypto.randomUUID().replace(/-/g,'')
const hash=async(value:string)=>Array.from(new Uint8Array(await crypto.subtle.digest(
 'SHA-256',new TextEncoder().encode(value))),byte=>byte.toString(16).padStart(2,'0')).join('')
function num(raw:string|null,min:number,max:number,def:number){
 const n=raw===null?def:Number(raw)
 return Number.isSafeInteger(n)&&n>=min&&n<=max?n:null
}
async function parse(req:Request,url:URL,actor:Actor){
 if(req.headers.get('origin')!==url.origin||
  req.headers.get('content-type')?.split(';')[0].trim().toLowerCase()!=='application/json')
  return null
 try{
  const raw=await req.text()
  if(raw.length>3500) return null
  const data=JSON.parse(raw) as unknown
  if(!data||typeof data!=='object'||Array.isArray(data))return null
  const body=data as Row
  if(body.expected_user_id!==actor.user_id)return null
  return body
 }catch{return null}
}
async function dashboard(env:Env,actor:Actor){
 const db=env.DB
 const [exams,practical,language,vocab,tasks]=await Promise.all([
  db.prepare('SELECT COUNT(*) total,COALESCE(SUM(is_correct),0) correct '+
   'FROM homeflow_study_attempts WHERE homeflow_user_id=?').bind(actor.user_id).first<Row>(),
  db.prepare('SELECT COUNT(*) total,COALESCE(AVG(score),0) mean '+
   'FROM homeflow_scenario_attempts WHERE homeflow_user_id=?').bind(actor.user_id).first<Row>(),
  db.prepare('SELECT COUNT(*) mastered FROM homeflow_language_mastery '+
   'WHERE homeflow_user_id=? AND mastered=1').bind(actor.user_id).first<Row>(),
  db.prepare('SELECT COUNT(*) total FROM homeflow_saved_vocabulary '+
   'WHERE homeflow_user_id=? AND is_deleted=0').bind(actor.user_id).first<Row>(),
  db.prepare('SELECT COUNT(*) total,COALESCE(SUM(completed),0) completed '+
   'FROM homeflow_daily_task_progress WHERE homeflow_user_id=? '+
   "AND study_date=date('now','+9 hours')").bind(actor.user_id).first<Row>()
 ])
 const total=Number(exams?.total||0),correct=Number(exams?.correct||0)
 return json({generated_from:'HomeFlow:user',
  exam:{attempted_questions:total,correct_answers:correct,
   accuracy_percent:total?Math.round(correct/total*100):null},
  practical:{completed_scenarios:Number(practical?.total||0),
   average_score:Number(practical?.mean||0)},
  language:{mastered_cards:Number(language?.mastered||0),tracked_cards:10144},
  vocabulary:{saved_terms:Number(vocab?.total||0)},
  today:{tasks_completed:Number(tasks?.completed||0),tasks_tracked:Number(tasks?.total||0)}})
}
async function questionProgress(env:Env,actor:Actor,url:URL,req:Request){
 const db=env.DB
 if(req.method==='GET'){
  const t=url.searchParams.get('track')||'exam-sg'
  if(!track(t))return json({code:'INVALID_TRACK'},400)
  const rows=await db.prepare('SELECT question_id,review_count,correct_streak,last_result,'+
   'next_review_at,mastered,version FROM homeflow_question_review_state '+
   'WHERE homeflow_user_id=? AND track_id=? ORDER BY next_review_at')
    .bind(actor.user_id,t).all<Row>()
  return json({items:rows.results||[],scope:'user'})
 }
 if(req.method!=='POST')return json({code:'METHOD_NOT_ALLOWED'},405)
 const body=await parse(req,url,actor)
 if(!body||!safeId(body.question_id)||typeof body.mastered!=='boolean'||
  !Number.isSafeInteger(body.expected_version)||Number(body.expected_version)<0||
  Object.keys(body).some(k=>!['expected_user_id','question_id','mastered','expected_version'].includes(k)))
  return json({code:'ACTOR_OR_PROGRESS_INVALID'},403)
 const question=await db.prepare('SELECT track_id FROM questions WHERE id=?')
  .bind(body.question_id).first<{track_id:string}>()
 if(!question||!track(question.track_id))return json({code:'QUESTION_NOT_FOUND'},404)
 const desired=body.mastered?1:0,stamp=new Date().toISOString()
 const version=Number(body.expected_version)
 const action=version===0?
  db.prepare('INSERT INTO homeflow_question_review_state '+
   '(homeflow_user_id,question_id,track_id,review_count,correct_streak,last_result,'+
   'next_review_at,mastered,version,updated_by_user_id,updated_at) '+
   "VALUES(?,?,?,0,?, ?,datetime(CURRENT_TIMESTAMP,?),?,1,?,?) "+
   'ON CONFLICT(homeflow_user_id,question_id) DO NOTHING')
   .bind(actor.user_id,body.question_id,question.track_id,desired?3:0,
    desired?'remembered':'again',desired?'+30 days':'+0 minutes',desired,actor.user_id,stamp):
  db.prepare('UPDATE homeflow_question_review_state SET mastered=?,'+
   'correct_streak=CASE WHEN ?=1 THEN max(correct_streak,3) ELSE 0 END,'+
   'last_result=?,next_review_at=datetime(CURRENT_TIMESTAMP,?),'+
   'version=version+1,updated_by_user_id=?,updated_at=? '+
   'WHERE homeflow_user_id=? AND question_id=? AND version=? AND mastered<>?')
   .bind(desired,desired,desired?'remembered':'again',desired?'+30 days':'+0 minutes',
    actor.user_id,stamp,actor.user_id,body.question_id,version,desired)
 const changed=await action.run()
 const result=await db.prepare('SELECT question_id,review_count,correct_streak,last_result,'+
  'next_review_at,mastered,version FROM homeflow_question_review_state '+
  'WHERE homeflow_user_id=? AND question_id=?')
   .bind(actor.user_id,body.question_id).first<Row>()
 if(!result||(!changed.meta?.changes&&Number(result.mastered)!==desired))
  return json({code:'VERSION_CONFLICT',current_version:result?.version??0},409)
 return json({ok:true,progress:result,scope:'user',actor_user_id:actor.user_id})
}
async function reviewQuestions(env:Env,actor:Actor,url:URL){
 const q=url.searchParams, t=q.get('track')||'exam-sg'
 const mode=q.get('mode')||'wrong'
 const limit=num(q.get('limit'),1,50,10),offset=num(q.get('offset'),0,10000,0)
 if(!track(t)||!reviewValues.some(x=>x===mode)||limit===null||offset===null)
  return json({code:'INVALID_FILTER'},400)
 const source=q.get('source')||'all'
 if(!sourceValues.some(x=>x===source))return json({code:'INVALID_SOURCE'},400)
 const year=q.get('year')||'',sitting=q.get('sitting')||''
 const section=q.get('section')||'',topic=q.get('topic')||''
 if(year&&!/^20[0-2][0-9]$/.test(year)||
  sitting&&!/^202[0-3]-(0[1-9]|1[0-2])-([0-2][0-9]|3[01])$/.test(sitting)||
  section&&!['A','B'].includes(section)||topic.length>100)return json({code:'INVALID_FILTER'},400)
 let where="q.track_id=? AND q.question_type='single_choice'"
 const args:unknown[]=[actor.user_id,actor.user_id,actor.user_id,t]
 if(source==='official'||source==='generated') {where+=' AND q.source_type=?';args.push(source)}
 if(source==='sample') where+=" AND q.question_kind='official_sample'"
 if(source==='licensed') where+=" AND q.source_type='licensed' AND q.question_kind='standard' AND q.exam_origin='general'"
 if(source==='exemption')where+=' AND q.id IN (SELECT canonical_question_id FROM fe_exemption_occurrences)'
 if(year){
  if(source==='exemption'||source==='all'){
   where+=' AND q.id IN (SELECT canonical_question_id FROM fe_exemption_occurrences WHERE fiscal_year=?)'
   args.push(Number(year))
  } else {
   where+=' AND q.id LIKE ?'
   args.push(t==='exam-sg'?'sg-official-%'+year+'%':'%-'+year+'-%')
  }
 }
 if(sitting){where+=' AND q.id IN (SELECT canonical_question_id FROM fe_exemption_occurrences WHERE sitting_date=?)';args.push(sitting)}
 if(section){where+=' AND q.exam_section=?';args.push(section)}
 if(topic){where+=' AND q.topic=?';args.push(topic)}
 if(mode==='wrong')where+=' AND s.mastered=0 AND wrong_count>0'
 if(mode==='due')where+=' AND s.mastered=0 AND s.next_review_at<=CURRENT_TIMESTAMP'
 if(mode==='mastered')where+=' AND s.mastered=1'
 if(mode==='unlearned')where+=' AND s.question_id IS NULL AND NOT EXISTS('+
  'SELECT 1 FROM homeflow_study_attempts old WHERE old.homeflow_user_id=? AND old.question_id=q.id)'
 if(mode==='unlearned')args.push(actor.user_id)
 if(mode==='practice')where+=' AND COALESCE(s.mastered,0)=0'
 // The derived table ensures wrong_count is never read from another actor.
 const sql='SELECT * FROM (SELECT q.id,q.track_id,q.topic,q.difficulty,q.prompt,'+
  'q.question_type,q.source_type,q.source_reference,q.question_kind,q.exam_origin,'+
  'q.exam_section,q.exam_section_method,q.original_question,q.language,'+
  'q.options_json,q.answer_json,q.explanation,'+
  'COALESCE(s.review_count,0) review_count,COALESCE(s.mastered,0) mastered,'+
  's.next_review_at,'+
  '(SELECT COUNT(*) FROM homeflow_study_attempts wa WHERE wa.homeflow_user_id=? '+
  'AND wa.question_id=q.id AND wa.is_correct=0) wrong_count,'+
  '(SELECT MAX(wa.answered_at) FROM homeflow_study_attempts wa '+
  'WHERE wa.homeflow_user_id=? AND wa.question_id=q.id AND wa.is_correct=0) last_wrong_at,'+
  's.question_id AS scoped_question_id FROM questions q LEFT JOIN '+
  'homeflow_question_review_state s ON s.homeflow_user_id=? AND s.question_id=q.id '+
  'WHERE '+where.replace(/wrong_count>0/g,"EXISTS(SELECT 1 FROM homeflow_study_attempts a WHERE a.homeflow_user_id='"+'{ACTOR}'+"' AND a.question_id=q.id AND a.is_correct=0)")+
  ') ORDER BY wrong_count DESC,id LIMIT ? OFFSET ?'
 // No actor ID may be interpolated into SQL; replace only with positional bind.
 const safeSql=sql.replace(/a.homeflow_user_id='\{ACTOR\}'/g,'a.homeflow_user_id=?')
 const after:unknown[]=[]
 // 'wrong' mode contributes another bound actor after WHERE filters.
 // Since this placeholder occurs inside WHERE before the unlearned placeholder,
 // its argument must be inserted immediately before any unlearned-mode bind.
 if(mode==='wrong') after.push(actor.user_id)
 const binder=mode==='unlearned'?[...args.slice(0,-1),...after,args.at(-1),limit,offset]:
  [...args,...after,limit,offset]
 const rs=await env.DB.prepare(safeSql).bind(...binder).all<Row>()
 const rows=rs.results||[]
 return json({mode,total:rows.length,offset,limit,has_more:rows.length===limit,
  items:rows.map(r=>({
   ...r,options:JSON.parse(String(r.options_json||'[]')),
   answer:JSON.parse(String(r.answer_json||'null')),
   options_json:undefined,answer_json:undefined,
   scoped_question_id:undefined
  })),scope:'user'})
}
async function languageProgress(env:Env,actor:Actor,which:'mastery'|'reviews'){
 if(which==='mastery'){
  const data=await env.DB.prepare('SELECT card_id,mastered,version,updated_at '+
   'FROM homeflow_language_mastery WHERE homeflow_user_id=? ORDER BY card_id')
   .bind(actor.user_id).all<Row>()
  return json({items:data.results||[],scope:'user'})
 }
 const data=await env.DB.prepare('SELECT card_id,review_count,correct_streak,'+
  'next_review_at,last_reviewed_at,last_result,last_grade,version '+
  'FROM homeflow_language_reviews WHERE homeflow_user_id=? ORDER BY card_id')
  .bind(actor.user_id).all<Row>()
 return json({items:data.results||[],scope:'user'})
}
export async function homeflowClassicPersonal(req:Request,env:Env):Promise<Response>{
 const url=new URL(req.url),path=url.pathname.slice('/api/homeflow-classic/'.length)
 if(!homeflowStudyReady(env,url))return json({code:'SSO_DISABLED'},503)
 if(env.HOMEFLOW_STUDY_EXAMS_ENABLED!=='true'||
  env.HOMEFLOW_STUDY_LANGUAGE_ENABLED!=='true')return json({code:'CLASSIC_SCOPE_DISABLED'},503)
 try{
  const actor=await verifiedStudyActor(req,env)
  if(!actor)return json({code:'SSO_NOT_AUTHENTICATED'},401)
  if(path==='dashboard'&&req.method==='GET')return dashboard(env,actor)
  if(path==='question-progress')return questionProgress(env,actor,url,req)
  if(path==='review-questions'&&req.method==='GET')return reviewQuestions(env,actor,url)
  if(path==='language-progress'&&req.method==='GET')return languageProgress(env,actor,'mastery')
  if(path==='language-review'&&req.method==='GET')return languageProgress(env,actor,'reviews')
  return json({code:'CLASSIC_ROUTE_UNSUPPORTED'},404)
 }catch{return json({code:'CLASSIC_PERSONAL_DATA_UNAVAILABLE'},503)}
}
