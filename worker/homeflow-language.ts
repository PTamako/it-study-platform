// Stage E independent HomeFlow learner space: language-card mastery and review.
// The legacy /api/language-progress and /api/language-review are owner-only.
import {verifiedStudyActor,homeflowStudyReady} from './homeflow-identity'

type Env={
 DB:D1Database
 APP_ENV?:string
 HOMEFLOW_STUDY_SSO_ENABLED?:string
 HOMEFLOW_STUDY_LANGUAGE_ENABLED?:string
 STUDY_PUBLIC_ORIGIN?:string
 HOMEFLOW_OAUTH_ORIGIN?:string
 STUDY_SSO_ENCRYPTION_KEY?:string
 HOMEFLOW_STUDY_SERVICE?:Fetcher
}
type Actor={user_id:string;household_id:string;role:'owner'|'member'}
type RecordValue=Record<string,unknown>
const json=(value:unknown,status=200)=>new Response(JSON.stringify(value),{
 status,headers:{'Content-Type':'application/json; charset=utf-8',
  'Cache-Control':'no-store','X-Content-Type-Options':'nosniff',
  'Referrer-Policy':'no-referrer'}
})
const id=()=>Array.from(crypto.getRandomValues(new Uint8Array(16)),
 x=>x.toString(16).padStart(2,'0')).join('')
const digest=async(s:string)=>Array.from(new Uint8Array(
 await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s))),
 x=>x.toString(16).padStart(2,'0')).join('')
const cardId=(x:unknown):x is string=>typeof x==='string'&&
 x.trim()===x&&x.length>0&&x.length<=160
const version=(x:unknown):x is number=>typeof x==='number'&&
 Number.isSafeInteger(x)&&x>=0&&x<=2147483647
function only(data:RecordValue,keys:string[]){
 return Object.keys(data).every(k=>keys.includes(k))
}
async function readBody(req:Request,url:URL){
 if(req.headers.get('origin')!==url.origin||
  req.headers.get('content-type')?.split(';')[0].trim().toLowerCase()!=='application/json')
  return null
 try{
  const raw=await req.text()
  if(raw.length>1600)return null
  const data=JSON.parse(raw) as unknown
  return data&&typeof data==='object'&&!Array.isArray(data)?data as RecordValue:null
 }catch{return null}
}
async function sentence(env:Env,card:string){
 return env.DB.prepare("SELECT id FROM language_cards WHERE id=? AND content_type='sentence'")
  .bind(card).first()
}
async function catalog(env:Env,url:URL,actor:Actor){
 const lang=url.searchParams.get('lang')||'ja'
 const after=url.searchParams.get('after')||''
 const limit=Number(url.searchParams.get('limit')||20)
 if(!['ja','en'].includes(lang))return json({code:'INVALID_LANGUAGE'},400)
 if(after&&!cardId(after))return json({code:'INVALID_CURSOR'},400)
 if(!Number.isSafeInteger(limit)||limit<1||limit>30)
  return json({code:'INVALID_LIMIT'},400)
 const rs=await env.DB.prepare(
  'SELECT c.id,c.language,c.category,c.term,c.reading,c.meaning_zh,'+
  'c.example,c.example_meaning_zh,'+
  'COALESCE(m.mastered,0) AS mastered,COALESCE(m.version,0) AS mastery_version,'+
  'COALESCE(r.review_count,0) AS review_count,COALESCE(r.correct_streak,0) AS correct_streak,'+
  'r.last_grade,r.next_review_at,COALESCE(r.version,0) AS review_version '+
  'FROM language_cards c '+
  'LEFT JOIN homeflow_language_mastery m ON m.card_id=c.id AND m.homeflow_user_id=? '+
  'LEFT JOIN homeflow_language_reviews r ON r.card_id=c.id AND r.homeflow_user_id=? '+
  "WHERE c.language=? AND c.content_type='sentence' AND c.id>? "+
  'ORDER BY c.id LIMIT ?')
  .bind(actor.user_id,actor.user_id,lang,after,limit+1).all<RecordValue>()
 const rows=rs.results||[],part=rows.slice(0,limit)
 return json({ok:true,scope:'user',language:lang,items:part.map(r=>({
  id:r.id,language:r.language,category:r.category,term:r.term,
  reading:r.reading,meaning_zh:r.meaning_zh,
  example:r.example,example_meaning_zh:r.example_meaning_zh,
  mastered:r.mastered===1,mastery_version:r.mastery_version,
  review_count:r.review_count,correct_streak:r.correct_streak,
  last_grade:r.last_grade,next_review_at:r.next_review_at,
  review_version:r.review_version
 })),next_cursor:rows.length>limit?part.at(-1)?.id:null})
}
async function mastery(req:Request,env:Env,url:URL,actor:Actor){
 const data=await readBody(req,url)
 if(!data)return json({code:'BAD_ORIGIN_OR_BODY'},403)
 // SSO session may change between Safari PWA save and a queued retry.
 if(data.expected_user_id!==actor.user_id)return json({code:'ACTOR_CHANGED'},403)
 if(!only(data,['card_id','mastered','version','expected_user_id'])||
  !cardId(data.card_id)||typeof data.mastered!=='boolean'||!version(data.version))
  return json({code:'INVALID_MASTERY'},400)
 const card=data.card_id,desired=data.mastered?1:0,expected=data.version
 if(!await sentence(env,card))return json({code:'CARD_NOT_FOUND'},404)
 const stamp=new Date().toISOString()
 const mutation=expected===0?
  env.DB.prepare('INSERT INTO homeflow_language_mastery '+
   '(homeflow_user_id,card_id,mastered,version,updated_by_user_id,updated_at) '+
   'VALUES(?,?,?,1,?,?) ON CONFLICT(homeflow_user_id,card_id) DO NOTHING')
   .bind(actor.user_id,card,desired,actor.user_id,stamp):
  env.DB.prepare('UPDATE homeflow_language_mastery SET mastered=?,version=version+1,'+
   'updated_by_user_id=?,updated_at=? WHERE homeflow_user_id=? AND card_id=? '+
   'AND version=? AND mastered<>?')
   .bind(desired,actor.user_id,stamp,actor.user_id,card,expected,desired)
 const writes=await env.DB.batch([
  mutation,
  env.DB.prepare('INSERT INTO homeflow_language_events '+
   '(event_id,actor_user_id,action,resource_sha256,affected_count,created_at) '+
   'SELECT ?,?,?,?,1,? WHERE changes()=1')
   .bind(id(),actor.user_id,desired?'mastered':'unmastered',await digest(card),stamp)
 ])
 if(![0,1].includes(writes[0]?.meta?.changes??-1)||
  writes[1]?.meta?.changes!==writes[0]?.meta?.changes)
  return json({code:'MASTERY_WRITE_CONFLICT'},409)
 const row=await env.DB.prepare('SELECT mastered,version FROM homeflow_language_mastery '+
  'WHERE homeflow_user_id=? AND card_id=?').bind(actor.user_id,card)
  .first<{mastered:number;version:number}>()
 if(!row)return json({code:'VERSION_CONFLICT'},409)
 if(writes[0].meta.changes===0&&row.mastered!==desired)
  return json({code:'VERSION_CONFLICT',current_version:row.version},409)
 return json({ok:true,scope:'user',card_id:card,mastered:row.mastered===1,
  version:row.version,replayed:writes[0].meta.changes===0,actor_user_id:actor.user_id})
}
type Review={card_id:string;review_count:number;correct_streak:number;
 last_result:string;last_grade:string;next_review_at:string;version:number}
async function currentReview(env:Env,actor:Actor,card:string){
 return env.DB.prepare('SELECT card_id,review_count,correct_streak,last_result,last_grade,'+
  'next_review_at,version FROM homeflow_language_reviews WHERE homeflow_user_id=? AND card_id=?')
  .bind(actor.user_id,card).first<Review>()
}
async function review(req:Request,env:Env,url:URL,actor:Actor){
 const data=await readBody(req,url)
 if(!data)return json({code:'BAD_ORIGIN_OR_BODY'},403)
 if(data.expected_user_id!==actor.user_id)return json({code:'ACTOR_CHANGED'},403)
 if(!only(data,['card_id','grade','version','request_id','expected_user_id'])||
  !cardId(data.card_id)||!version(data.version)||
  !['again','hard','remembered'].includes(String(data.grade))||
  typeof data.request_id!=='string'||!/^[A-Za-z0-9_-]{20,96}$/.test(data.request_id))
  return json({code:'INVALID_REVIEW'},400)
 const card=data.card_id,grade=String(data.grade),expected=data.version
 const requestHash=await digest(data.request_id)
 const payloadHash=await digest(card+'\u0000'+grade+'\u0000'+expected)
 // Durable dedupe across Safari retries, request timeouts and PWA relaunch.
 const previous=await env.DB.prepare('SELECT payload_hash FROM homeflow_language_events '+
  "WHERE actor_user_id=? AND request_hash=? AND action='graded'")
  .bind(actor.user_id,requestHash).first<{payload_hash:string}>()
 if(previous){
  if(previous.payload_hash!==payloadHash)return json({code:'REQUEST_REUSED'},409)
  return json({ok:true,replayed:true,scope:'user',card_id:card,
   review:await currentReview(env,actor,card)})
 }
 if(!await sentence(env,card))return json({code:'CARD_NOT_FOUND'},404)
 const stamp=new Date().toISOString(),remembered=grade==='remembered'
 const lastResult=remembered?'remembered':'again'
 const after=grade==='again'?'+10 minutes':grade==='hard'?'+6 hours':'+1 day'
 const mutation=expected===0?
  env.DB.prepare('INSERT INTO homeflow_language_reviews '+
   '(homeflow_user_id,card_id,review_count,correct_streak,next_review_at,'+
   'last_reviewed_at,last_result,last_grade,version,updated_by_user_id,updated_at) '+
   'VALUES(?,?,1,?,datetime(CURRENT_TIMESTAMP,?),CURRENT_TIMESTAMP,?,?,1,?,?) '+
   'ON CONFLICT(homeflow_user_id,card_id) DO NOTHING')
   .bind(actor.user_id,card,remembered?1:0,after,lastResult,grade,actor.user_id,stamp):
  env.DB.prepare('UPDATE homeflow_language_reviews SET '+
   'review_count=review_count+1,'+
   "correct_streak=CASE WHEN ?='remembered' THEN correct_streak+1 ELSE 0 END,"+
   "next_review_at=datetime(CURRENT_TIMESTAMP,CASE WHEN ?='again' THEN '+10 minutes' "+
   "WHEN ?='hard' THEN '+6 hours' ELSE CASE min(correct_streak+1,4) "+
   "WHEN 1 THEN '+1 day' WHEN 2 THEN '+3 days' "+
   "WHEN 3 THEN '+7 days' ELSE '+14 days' END END),"+
   'last_reviewed_at=CURRENT_TIMESTAMP,last_result=?,last_grade=?,version=version+1,'+
   'updated_by_user_id=?,updated_at=? '+
   'WHERE homeflow_user_id=? AND card_id=? AND version=?')
   .bind(grade,grade,grade,lastResult,grade,actor.user_id,stamp,
    actor.user_id,card,expected)
 const writes=await env.DB.batch([
  mutation,
  env.DB.prepare('INSERT INTO homeflow_language_events '+
   '(event_id,actor_user_id,action,resource_sha256,request_hash,payload_hash,'+
   'affected_count,created_at) SELECT ?,?,\'graded\',?,?,?,1,? WHERE changes()=1')
   .bind(id(),actor.user_id,await digest(card),requestHash,payloadHash,stamp)
 ])
 if(![0,1].includes(writes[0]?.meta?.changes??-1)||
  writes[1]?.meta?.changes!==writes[0]?.meta?.changes)
  return json({code:'REVIEW_WRITE_CONFLICT'},409)
 const row=await currentReview(env,actor,card)
 if(writes[0].meta.changes!==1||!row)
  return json({code:'VERSION_CONFLICT',current_version:row?.version??0},409)
 return json({ok:true,replayed:false,scope:'user',card_id:card,
  review:row,actor_user_id:actor.user_id})
}
function validLegacy(row:RecordValue,kind:'mastery'|'reviews'){
 if(!cardId(row.card_id)||typeof row.updated_at!=='string'||
  row.updated_at.length<10||row.updated_at.length>80)return false
 if(kind==='mastery')return row.mastered===0||row.mastered===1
 return Number.isSafeInteger(row.review_count)&&Number(row.review_count)>=0&&
  Number.isSafeInteger(row.correct_streak)&&Number(row.correct_streak)>=0&&
  Number(row.correct_streak)<=Number(row.review_count)&&
  ['again','remembered'].includes(String(row.last_result))&&
  (row.last_grade===null||row.last_grade===undefined||
   ['again','hard','remembered'].includes(String(row.last_grade)))&&
  typeof row.next_review_at==='string'&&row.next_review_at.length>=10&&
  row.next_review_at.length<=80&&
  typeof row.last_reviewed_at==='string'&&row.last_reviewed_at.length>=10&&
  row.last_reviewed_at.length<=80
}
async function adopt(req:Request,env:Env,url:URL,actor:Actor){
 if(actor.role!=='owner')return json({code:'ONLY_ORIGINAL_OWNER'},403)
 const data=await readBody(req,url)
 if(!data)return json({code:'BAD_ORIGIN_OR_BODY'},403)
 if(data.expected_user_id!==actor.user_id)return json({code:'ACTOR_CHANGED'},403)
 if(data.confirm!==true||
  !only(data,['confirm','kind','after','expected_user_id'])||
  !['mastery','reviews'].includes(String(data.kind)))
  return json({code:'CONFIRM_REQUIRED'},403)
 const kind=data.kind as 'mastery'|'reviews'
 const after=data.after===undefined?'':data.after
 if(typeof after!=='string'||(after!==''&&!cardId(after)))
  return json({code:'INVALID_CURSOR'},400)
 const table=kind==='mastery'?'language_card_progress':'language_card_reviews'
 const rs=await env.DB.prepare('SELECT * FROM '+table+' WHERE card_id>? '+
  'ORDER BY card_id LIMIT 21').bind(after).all<RecordValue>()
 const rows=rs.results||[],chosen=rows.slice(0,20)
 if(chosen.some(row=>!validLegacy(row,kind)))
  return json({code:'LEGACY_LANGUAGE_REVIEW_REQUIRED'},409)
 if(!chosen.length)return json({ok:true,kind,adopted:0,has_more:false,
  next_cursor:null,scope:'owner_only'})
 const last=String(chosen.at(-1)?.card_id),stamp=new Date().toISOString()
 const sql=kind==='mastery'?
  'INSERT OR IGNORE INTO homeflow_language_mastery '+
   '(homeflow_user_id,card_id,mastered,version,updated_by_user_id,updated_at) '+
   'SELECT ?,card_id,mastered,1,?,updated_at FROM language_card_progress '+
   'WHERE card_id>? ORDER BY card_id LIMIT 20':
  'INSERT OR IGNORE INTO homeflow_language_reviews '+
   '(homeflow_user_id,card_id,review_count,correct_streak,next_review_at,'+
   'last_reviewed_at,last_result,last_grade,version,updated_by_user_id,updated_at) '+
   'SELECT ?,card_id,review_count,correct_streak,next_review_at,'+
   'last_reviewed_at,last_result,COALESCE(last_grade,last_result),1,?,updated_at '+
   'FROM language_card_reviews WHERE card_id>? ORDER BY card_id LIMIT 20'
 const changes=await env.DB.batch([
  env.DB.prepare(sql).bind(actor.user_id,actor.user_id,after),
  env.DB.prepare('INSERT INTO homeflow_language_events '+
   '(event_id,actor_user_id,action,resource_sha256,affected_count,created_at) '+
   "SELECT ?,?,?,NULL,changes(),? WHERE changes()>0")
   .bind(id(),actor.user_id,kind==='mastery'?'legacy_mastery_adopted':'legacy_reviews_adopted',stamp)
 ])
 const count=changes[0]?.meta?.changes??-1
 if(count<0||count>20||changes[1]?.meta?.changes!==(count>0?1:0))
  return json({code:'LEGACY_ADOPTION_CONFLICT'},409)
 return json({ok:true,kind,adopted:count,has_more:rows.length>20,
  next_cursor:rows.length>20?last:null,scope:'owner_only',legacy_changed:false})
}
export async function homeflowLanguage(req:Request,env:Env):Promise<Response>{
 const url=new URL(req.url)
 const enabled=homeflowStudyReady(env,url)&&env.HOMEFLOW_STUDY_LANGUAGE_ENABLED==='true'
 if(url.pathname==='/api/homeflow-study/language/status'&&req.method==='GET')
  return json({enabled,scope:'user',legacy_access:false})
 if(!enabled)return json({code:'STUDY_LANGUAGE_DISABLED'},503)
 try{
  const actor=await verifiedStudyActor(req,env)
  if(!actor)return json({code:'SSO_NOT_AUTHENTICATED'},401)
  if(url.pathname==='/api/homeflow-study/language/cards'&&req.method==='GET')
   return catalog(env,url,actor)
  if(url.pathname==='/api/homeflow-study/language/mastery'&&req.method==='POST')
   return mastery(req,env,url,actor)
  if(url.pathname==='/api/homeflow-study/language/review'&&req.method==='POST')
   return review(req,env,url,actor)
  if(url.pathname==='/api/homeflow-study/language/legacy/adopt'&&req.method==='POST')
   return adopt(req,env,url,actor)
  return json({code:'NOT_FOUND'},404)
 }catch{return json({code:'STUDY_LANGUAGE_UNAVAILABLE'},503)}
}
