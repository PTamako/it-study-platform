// Stage E: manual sentence cards have NEW private HomeFlow-user IDs.
// NO legacy single-password cookie, no automatic import and no document
// bridge writes. Document sync will require separate signed target execution.
import {verifiedStudyActor,homeflowStudyReady} from './homeflow-identity'
type Env={
 DB:D1Database;APP_ENV?:string;HOMEFLOW_STUDY_SSO_ENABLED?:string
 HOMEFLOW_STUDY_SENTENCES_ENABLED?:string;STUDY_PUBLIC_ORIGIN?:string
 HOMEFLOW_OAUTH_ORIGIN?:string;STUDY_SSO_ENCRYPTION_KEY?:string
 HOMEFLOW_STUDY_SERVICE?:Fetcher
}
type Actor={user_id:string;household_id:string;role:'owner'|'member'}
type Row={card_id:string;language:string;sentence_text:string;translation_zh:string;
 notes:string;version:number;is_deleted:number;updated_at:string}
const hex32=/^[a-f0-9]{32}$/
const reply=(data:unknown,status=200)=>new Response(JSON.stringify(data),{
 status,headers:{'Content-Type':'application/json; charset=utf-8',
  'Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'}
})
const token=()=>Array.from(crypto.getRandomValues(new Uint8Array(16)),
 n=>n.toString(16).padStart(2,'0')).join('')
const safe=(v:unknown,max:number)=>typeof v==='string'&&v.length<=max&&
 !/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(v)
async function readJson(req:Request,url:URL){
 if(req.headers.get('origin')!==url.origin||
  req.headers.get('content-type')?.split(';')[0].trim().toLowerCase()!=='application/json')
  return null
 try{
  const raw=await req.text()
  const body=raw.length<=5000?JSON.parse(raw):null
  return body&&typeof body==='object'&&!Array.isArray(body)?
   body as Record<string,unknown>:null
 }catch{return null}
}
function present(r:Row){
 return {card_id:r.card_id,language:r.language,sentence:r.sentence_text,
  translation_zh:r.translation_zh,notes:r.notes,version:r.version,
  updated_at:r.updated_at}
}
async function list(env:Env,url:URL,actor:Actor){
 const after=url.searchParams.get('after')||''
 const limit=Number(url.searchParams.get('limit')||10)
 if(after&&!hex32.test(after))return reply({code:'INVALID_CURSOR'},400)
 if(!Number.isSafeInteger(limit)||limit<1||limit>20)
  return reply({code:'INVALID_LIMIT'},400)
 const rows=(await env.DB.prepare(
  'SELECT card_id,language,sentence_text,translation_zh,notes,version,is_deleted,updated_at '+
  'FROM homeflow_personal_sentence_cards WHERE homeflow_user_id=? AND card_id>? '+
  'AND is_deleted=0 ORDER BY card_id LIMIT ?')
  .bind(actor.user_id,after,limit+1).all<Row>()).results||[]
 const entries=rows.slice(0,limit)
 return reply({ok:true,scope:'user',actor_user_id:actor.user_id,
  items:entries.map(present),next_cursor:rows.length>limit?
   entries.at(-1)?.card_id:null})
}
async function change(req:Request,env:Env,url:URL,actor:Actor){
 const v=await readJson(req,url)
 if(!v)return reply({code:'BAD_ORIGIN_OR_BODY'},403)
 if(v.expected_user_id!==actor.user_id)
  return reply({code:'ACTOR_CHANGED'},403)
 if(Object.keys(v).some(k=>!['expected_user_id','card_id','action',
  'language','sentence','translation_zh','notes','expected_version'].includes(k)))
  return reply({code:'INVALID_FIELDS'},400)
 if(!hex32.test(String(v.card_id))||
  !['save','remove'].includes(String(v.action))||
  !Number.isSafeInteger(v.expected_version)||Number(v.expected_version)<0)
  return reply({code:'INVALID_CARD_MUTATION'},400)
 const isRemove=v.action==='remove'
 if(isRemove&&Object.keys(v).some(k=>
  ['sentence','translation_zh','notes','language'].includes(k)))
  return reply({code:'INVALID_REMOVE_FIELDS'},400)
 if(!isRemove&&(!['ja','en'].includes(String(v.language))||
  !safe(v.sentence,700)||!(v.sentence as string).trim()||
  !safe(v.translation_zh,700)||!safe(v.notes,500)))
  return reply({code:'INVALID_SENTENCE'},400)
 const cardId=String(v.card_id),db=env.DB
 const old=await db.prepare(
  'SELECT card_id,language,sentence_text,translation_zh,notes,version,is_deleted,updated_at '+
  'FROM homeflow_personal_sentence_cards WHERE homeflow_user_id=? AND card_id=?')
  .bind(actor.user_id,cardId).first<Row>()
 if(isRemove&&!old)return reply({code:'CARD_NOT_FOUND'},404)
 if(old&&((isRemove&&old.is_deleted===1)||
  (!isRemove&&old.is_deleted===0&&old.language===v.language&&
   old.sentence_text===v.sentence&&old.translation_zh===v.translation_zh&&
   old.notes===v.notes)))
  return reply({ok:true,scope:'user',actor_user_id:actor.user_id,
   replayed:true,removed:old.is_deleted===1,card_id:cardId,version:old.version})
 if(old&&old.version!==v.expected_version)return reply({code:'STALE_SENTENCE_VERSION'},409)
 if(!old&&v.expected_version!==0)return reply({code:'STALE_SENTENCE_VERSION'},409)
 const now=new Date().toISOString()
 const write=old?
  db.prepare('UPDATE homeflow_personal_sentence_cards SET '+
   (isRemove?'is_deleted=1,':'language=?,sentence_text=?,translation_zh=?,notes=?,is_deleted=0,')+
   'version=version+1,updated_by_user_id=?,updated_at=? '+
   'WHERE homeflow_user_id=? AND card_id=? AND version=?')
  .bind(...(isRemove?[]:[v.language,v.sentence,v.translation_zh,v.notes]),
   actor.user_id,now,actor.user_id,cardId,old.version):
  db.prepare('INSERT INTO homeflow_personal_sentence_cards '+
   '(homeflow_user_id,card_id,language,sentence_text,translation_zh,notes,'+
   'source_kind,is_deleted,version,updated_by_user_id,updated_at) '+
   "VALUES(?,?,?,?,?,?,'manual',0,1,?,?)")
   .bind(actor.user_id,cardId,v.language,v.sentence,v.translation_zh,v.notes,
    actor.user_id,now)
 try{
  const result=await db.batch([
   write,
   db.prepare('INSERT INTO homeflow_personal_sentence_events '+
    '(event_id,actor_user_id,card_id,action,created_at) '+
    'SELECT ?,?,?,?,? WHERE changes()=1')
    .bind(token(),actor.user_id,cardId,isRemove?'removed':old?'edited':'saved',now)
  ])
  if(result.length!==2||result[0]?.meta?.changes!==1||result[1]?.meta?.changes!==1)
   return reply({code:'SENTENCE_WRITE_CONFLICT'},409)
 }catch{return reply({code:'SENTENCE_RECONCILE_REQUIRED'},409)}
 const row=await db.prepare(
  'SELECT card_id,language,sentence_text,translation_zh,notes,version,is_deleted,updated_at '+
  'FROM homeflow_personal_sentence_cards WHERE homeflow_user_id=? AND card_id=?')
  .bind(actor.user_id,cardId).first<Row>()
 if(!row)return reply({code:'SENTENCE_RECEIPT_UNAVAILABLE'},503)
 return reply({ok:true,scope:'user',actor_user_id:actor.user_id,
  replayed:false,removed:row.is_deleted===1,card_id:cardId,version:row.version})
}
export async function homeflowSentences(req:Request,env:Env):Promise<Response>{
 const url=new URL(req.url),ready=homeflowStudyReady(env,url)&&
  env.HOMEFLOW_STUDY_SENTENCES_ENABLED==='true'
 if(url.pathname==='/api/homeflow-study/sentences/status'&&req.method==='GET')
  return reply({enabled:ready,scope:'user',legacy_access:false})
 if(!ready)return reply({code:'STUDY_SENTENCES_DISABLED'},503)
 try{
  const actor=await verifiedStudyActor(req,env)
  if(!actor)return reply({code:'SSO_NOT_AUTHENTICATED'},401)
  if(url.pathname==='/api/homeflow-study/sentences'){
   if(req.method==='GET')return list(env,url,actor)
   if(req.method==='POST')return change(req,env,url,actor)
  }
  return reply({code:'NOT_FOUND'},404)
 }catch{return reply({code:'STUDY_SENTENCES_UNAVAILABLE'},503)}
}
