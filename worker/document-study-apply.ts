// Internal persistence primitive ONLY: not registered as an HTTP route.
// A future caller MUST first authenticate HomeFlow's executing lease, source
// version/authorization and exact snapshot, and recheck active membership.
// This module itself is never approval or source-authorization proof.
type Intent={approval_id:string;candidate_id:string;household_id:string;
 requester_user_id:string;payload_sha256:string;snapshot:string}
type Receipt={approval_id:string;candidate_id:string;household_id:string;
 requester_user_id:string;payload_sha256:string;kind:string;remote_id:string;
 effect:string;applied_at:number}
const id32=/^[a-f0-9]{32}$/
const sha64=/^[a-f0-9]{64}$/
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i
const enc=new TextEncoder()
const token=()=>Array.from(crypto.getRandomValues(new Uint8Array(16)),x=>x.toString(16).padStart(2,'0')).join('')
const digest=async(raw:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',enc.encode(raw))),x=>x.toString(16).padStart(2,'0')).join('')
const safe=(x:unknown,max:number)=>typeof x==='string'&&x.trim().length>0&&x.length<=max&&
 !/[\u0000-\u001f\u007f]/.test(x)
const same=(r:Receipt|null,i:Intent)=>!!r&&r.approval_id===i.approval_id&&r.candidate_id===i.candidate_id&&
 r.household_id===i.household_id&&r.requester_user_id===i.requester_user_id&&r.payload_sha256===i.payload_sha256
const readReceipt=async(db:D1Database,i:Intent)=>db.prepare(
 'SELECT * FROM homeflow_document_study_receipts WHERE approval_id=? OR candidate_id=? LIMIT 1')
 .bind(i.approval_id,i.candidate_id).first<Receipt>()
export async function applyVerifiedDocumentStudy(db:D1Database,i:Intent){
 if(!i||!uuid.test(i.approval_id)||!id32.test(i.candidate_id)||
  !sha64.test(i.payload_sha256)||!safe(i.household_id,128)||!safe(i.requester_user_id,128)||
  typeof i.snapshot!=='string'||i.snapshot.length>5000||await digest(i.snapshot)!==i.payload_sha256)
  return {ok:false,code:'INVALID_SNAPSHOT',applied:false}
 let envelope:Record<string,unknown>,p:Record<string,unknown>
 try{
  envelope=JSON.parse(i.snapshot)
  if(!envelope||typeof envelope!=='object'||Array.isArray(envelope)||
   Object.keys(envelope).sort().join(',')!==['source_document_id','source_candidate_id',
    'source_document_version','candidate_updated_at','candidate_kind','homeflow_user_id',
    'homeflow_household_id','target_app','payload'].sort().join(','))throw Error('envelope')
  p=envelope.payload as Record<string,unknown>
  if(!p||typeof p!=='object'||Array.isArray(p)||envelope.source_candidate_id!==i.candidate_id||
   envelope.homeflow_user_id!==i.requester_user_id||envelope.homeflow_household_id!==i.household_id||
   envelope.target_app!=='it-study-platform'||!safe(envelope.source_document_id,128)||
   !safe(envelope.candidate_updated_at,64)||!Number.isSafeInteger(envelope.source_document_version)||
   Number(envelope.source_document_version)<1||!['sentence','vocabulary'].includes(String(envelope.candidate_kind))||
   p.operation!==envelope.candidate_kind||p.language!=='ja'||p.skip_existing!==true)throw Error('identity')
  if(p.operation==='sentence'){
   if(Object.keys(p).sort().join(',')!==['operation','language','sentence','meaning_zh','privacy_confirmed','skip_existing'].sort().join(',')||
    p.privacy_confirmed!==true||!safe(p.sentence,220)||!safe(p.meaning_zh,400)||
    /[\d０-９]{5,}|@|〒/.test(String(p.sentence)))throw Error('sentence')
  }else if(Object.keys(p).sort().join(',')!==['operation','language','term','reading','meaning_zh','skip_existing'].sort().join(',')||
   !safe(p.term,100)||!safe(p.meaning_zh,200)||typeof p.reading!=='string'||p.reading.length>100||
   /[\u0000-\u001f\u007f]/.test(p.reading)||/[\d０-９]{5,}|@|〒/.test(String(p.term)))throw Error('vocabulary')
 }catch{return {ok:false,code:'INVALID_SNAPSHOT',applied:false}}
 const active=await db.prepare('SELECT 1 FROM homeflow_identity_links WHERE homeflow_user_id=? '+
  "AND homeflow_household_id=? AND role='member' AND state='active'")
  .bind(i.requester_user_id,i.household_id).first()
 if(!active)return {ok:false,code:'MEMBER_SCOPE_INVALID',applied:false}
 const existing=await readReceipt(db,i)
 if(existing)return same(existing,i)?{ok:true,applied:true,replayed:true,receipt:existing}:
  {ok:false,code:'RECEIPT_IDENTITY_CONFLICT',applied:false}
 const at=Date.now(),stamp=new Date(at).toISOString(),kind=String(p.operation)
 const remote=kind==='sentence'?i.candidate_id:'ja:'+String(p.term)
 try{
  if(kind==='sentence'){
   const results=await db.batch([
    db.prepare('INSERT INTO homeflow_personal_sentence_cards '+
     '(homeflow_user_id,card_id,language,sentence_text,translation_zh,notes,source_kind,is_deleted,version,updated_by_user_id,updated_at) '+
     "SELECT ?,?,'ja',?,?,'','document',0,1,?,? WHERE EXISTS(SELECT 1 FROM homeflow_identity_links "+
     "WHERE homeflow_user_id=? AND homeflow_household_id=? AND role='member' AND state='active')")
     .bind(i.requester_user_id,remote,p.sentence,p.meaning_zh,i.requester_user_id,stamp,i.requester_user_id,i.household_id),
    db.prepare('INSERT INTO homeflow_document_study_receipts '+
     '(approval_id,candidate_id,household_id,requester_user_id,payload_sha256,kind,remote_id,effect,applied_at) '+
     "VALUES(?,?,?,?,?,'sentence',(SELECT card_id FROM homeflow_personal_sentence_cards WHERE homeflow_user_id=? AND card_id=? AND source_kind='document' AND changes()=1),'created',?)")
     .bind(i.approval_id,i.candidate_id,i.household_id,i.requester_user_id,i.payload_sha256,i.requester_user_id,remote,at),
    db.prepare('INSERT INTO homeflow_personal_sentence_events(event_id,actor_user_id,card_id,action,created_at) '+
     "SELECT ?,?,?,'saved',? WHERE changes()=1")
     .bind(token(),i.requester_user_id,remote,stamp)
   ])
   if(results.some(x=>x.meta?.changes!==1))return {ok:false,code:'RECEIPT_RECONCILE_REQUIRED',applied:false}
  }else{
   const old=await db.prepare('SELECT is_deleted FROM homeflow_saved_vocabulary '+
    "WHERE homeflow_user_id=? AND language='ja' AND term=?")
    .bind(i.requester_user_id,p.term).first<{is_deleted:number}>()
   if(old?.is_deleted===1)return {ok:false,code:'VOCABULARY_REMOVED',applied:false}
   const entry=JSON.stringify({term:p.term,reading:p.reading,zh:p.meaning_zh,
    meaning_zh:p.meaning_zh,language:'ja',source:'document'})
   const termHash=await digest('ja\u0000'+String(p.term))
   const results=await db.batch([
    db.prepare('INSERT INTO homeflow_saved_vocabulary(homeflow_user_id,language,term,entry_json,is_deleted,updated_by_user_id,saved_at) '+
     "SELECT ?,'ja',?,?,0,?,? WHERE EXISTS(SELECT 1 FROM homeflow_identity_links WHERE homeflow_user_id=? "+
     "AND homeflow_household_id=? AND role='member' AND state='active') ON CONFLICT(homeflow_user_id,language,term) DO NOTHING")
     .bind(i.requester_user_id,p.term,entry,i.requester_user_id,stamp,i.requester_user_id,i.household_id),
    db.prepare('INSERT INTO homeflow_document_study_receipts '+
     '(approval_id,candidate_id,household_id,requester_user_id,payload_sha256,kind,remote_id,effect,applied_at) '+
     "SELECT ?,?,?,?,?,'vocabulary',?,CASE WHEN changes()=1 THEN 'created' ELSE 'already_present' END,? "+
     "WHERE EXISTS(SELECT 1 FROM homeflow_saved_vocabulary v JOIN homeflow_identity_links l ON l.homeflow_user_id=v.homeflow_user_id "+
     "WHERE v.homeflow_user_id=? AND v.language='ja' AND v.term=? AND v.is_deleted=0 "+
     "AND l.homeflow_household_id=? AND l.role='member' AND l.state='active')")
     .bind(i.approval_id,i.candidate_id,i.household_id,i.requester_user_id,i.payload_sha256,remote,at,i.requester_user_id,p.term,i.household_id),
    db.prepare('INSERT INTO homeflow_vocabulary_events(event_id,actor_user_id,action,term_sha256,affected_count,created_at) '+
     "SELECT ?,?,'saved',?,1,? FROM homeflow_document_study_receipts WHERE approval_id=? AND effect='created' AND changes()=1")
     .bind(token(),i.requester_user_id,termHash,stamp,i.approval_id)
   ])
   if(results[1]?.meta?.changes!==1)return {ok:false,code:'RECEIPT_RECONCILE_REQUIRED',applied:false}
  }
 }catch{
  const raced=await readReceipt(db,i).catch(()=>null)
  return same(raced,i)?{ok:true,applied:true,replayed:true,receipt:raced}:
   {ok:false,code:'WRITE_CONFLICT',applied:false}
 }
 const receipt=await readReceipt(db,i)
 return same(receipt,i)?{ok:true,applied:true,replayed:false,receipt}:
  {ok:false,code:'RECEIPT_RECONCILE_REQUIRED',applied:false}
}
