// Private signed document -> study target ONLY, not the manual collection
// bridge. Every FIRST write revalidates HomeFlow's live executing nonce and
// Document Assistant's current owner/version/revocation. All flags default OFF.
import {applyVerifiedDocumentStudy} from './document-study-apply'

type DbEnv={DB:D1Database;APP_ENV?:string;DOCUMENT_STUDY_EXECUTION_ENABLED?:string;
 DOCUMENT_STUDY_EXECUTION_SECRET?:string;DOCUMENT_STUDY_PROOF_SECRET?:string;
 DOCUMENT_STUDY_SOURCE_SECRET?:string;
 DOCUMENT_STUDY_HOMEFLOW_SERVICE?:Fetcher;DOCUMENT_STUDY_SOURCE_SERVICE?:Fetcher}
const hash=/^[a-f0-9]{64}$/i,id32=/^[a-f0-9]{32}$/i
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i
const enc=new TextEncoder()
const core=['request_id','resource_id','household_id','requester_user_id','payload_sha256']
const reply=(data:Record<string,unknown>,status=200)=>new Response(JSON.stringify(data),
 {status,headers:{'content-type':'application/json','cache-control':'no-store'}})
const fail=(code:string,status=403)=>reply({ok:false,code,applied:false},status)
const exact=(body:unknown,expected:string[]):body is Record<string,any>=>
 !!body&&typeof body==='object'&&!Array.isArray(body)&&
 Object.keys(body).sort().join(',')===expected.slice().sort().join(',')
function on(e:DbEnv){
 return e.APP_ENV==='production'&&e.DOCUMENT_STUDY_EXECUTION_ENABLED==='true'&&
 !!e.DB?.prepare&&hash.test(e.DOCUMENT_STUDY_EXECUTION_SECRET||'')&&
 hash.test(e.DOCUMENT_STUDY_PROOF_SECRET||'')&&
 hash.test(e.DOCUMENT_STUDY_SOURCE_SECRET||'')&&
 typeof e.DOCUMENT_STUDY_HOMEFLOW_SERVICE?.fetch==='function'&&
 typeof e.DOCUMENT_STUDY_SOURCE_SERVICE?.fetch==='function'
}
async function hmac(secret:string,domain:string,stamp:string,raw:string){
 const key=await crypto.subtle.importKey('raw',
  Uint8Array.from(secret.match(/.{2}/g)!,b=>parseInt(b,16)),
  {name:'HMAC',hash:'SHA-256'},false,['sign'])
 return Array.from(new Uint8Array(await crypto.subtle.sign('HMAC',key,
  enc.encode(domain+'\n'+stamp+'\n'+raw))),b=>b.toString(16).padStart(2,'0')).join('')
}
const same=(a:string,b:string)=>a.length===b.length&&
 /^[a-f0-9]+$/i.test(a+b)&&
 Array.from(a).reduce((x,v,i)=>x|(v.charCodeAt(0)^b.charCodeAt(i)),0)===0
async function input(req:Request,env:DbEnv,mode:'execute'|'receipt'){
 if(req.method!=='POST'||req.headers.has('cookie')||req.headers.has('origin')||
  req.headers.has('authorization')||
  req.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase()!=='application/json'||
  req.headers.get('x-approval-client')!=='jp-document-assistant')return null
 const stamp=req.headers.get('x-approval-timestamp')||''
 const signature=req.headers.get('x-approval-signature')||''
 if(!/^\d{13}$/.test(stamp)||Math.abs(Date.now()-Number(stamp))>300000||
  !hash.test(signature))return null
 let raw:string,body:unknown
 try{raw=await req.text();if(raw.length>(mode==='execute'?6500:1200))return null
  body=JSON.parse(raw)}catch{return null}
 const expected=mode==='execute'?[...core,'execution_nonce','snapshot']:core
 if(!exact(body,expected)||!uuid.test(body.request_id)||!id32.test(body.resource_id)||
  !hash.test(body.payload_sha256)||typeof body.household_id!=='string'||
  !body.household_id||body.household_id.length>128||
  typeof body.requester_user_id!=='string'||!body.requester_user_id||
  body.requester_user_id.length>128||
  (mode==='execute'&&(!hash.test(body.execution_nonce)||
   typeof body.snapshot!=='string'||body.snapshot.length>5000)))return null
 const calculated=await hmac(env.DOCUMENT_STUDY_EXECUTION_SECRET!,
  'jpda:study-'+mode,stamp,raw)
 return same(signature,calculated)?body:null
}
const signed=async(service:Fetcher|undefined,secret:string,domain:string,client:string,
 route:string,payload:Record<string,unknown>)=>{
 if(typeof service?.fetch!=='function')return null
 const raw=JSON.stringify(payload),stamp=String(Date.now())
 const req=new Request('https://internal.invalid'+route,{method:'POST',redirect:'manual',
  headers:{'content-type':'application/json','accept':'application/json',
   'x-approval-client':client,'x-approval-timestamp':stamp,
   'x-approval-signature':await hmac(secret,domain,stamp,raw)},body:raw})
 try{const r=await service.fetch(req)
  if(r.status!==200||!r.ok||r.headers.has('location'))return null
  const text=await r.text()
  if(text.length>2300)return null
  return JSON.parse(text) as Record<string,any>
 }catch{return null}
}
async function original(db:D1Database,b:Record<string,any>){
 return db.prepare('SELECT r.*,a.approver_user_id FROM homeflow_document_study_receipts r '+
  'JOIN homeflow_document_study_approval_audit a ON a.approval_id=r.approval_id '+
  'WHERE r.approval_id=? OR r.candidate_id=? LIMIT 1')
  .bind(b.request_id,b.resource_id).first<Record<string,any>>()
}
function identical(r:Record<string,any>|null,b:Record<string,any>){
 return r&&r.approval_id===b.request_id&&r.candidate_id===b.resource_id&&
  r.household_id===b.household_id&&r.requester_user_id===b.requester_user_id&&
  r.payload_sha256===b.payload_sha256
}
const safeReceipt=(r:Record<string,any>,replayed:boolean)=>({
 ok:true,applied:true,approval_id:r.approval_id,candidate_id:r.candidate_id,
 household_id:r.household_id,requester_user_id:r.requester_user_id,
 payload_sha256:r.payload_sha256,kind:r.kind,remote_id:r.remote_id,
 effect:r.effect,approver_user_id:r.approver_user_id,
 applied_at:r.applied_at,already_applied:replayed
})
export async function documentStudyExecution(req:Request,env:DbEnv){
 if(!on(env))return fail('document_study_execution_disabled',503)
 const route=new URL(req.url).pathname
 const mode=route.endsWith('/execute')?'execute':route.endsWith('/receipt')?'receipt':null
 if(!mode)return fail('not_found',404)
 const b=await input(req,env,mode)
 if(!b)return fail('unauthorized',403)
 const prior=await original(env.DB,b)
 if(prior)return identical(prior,b)?reply(safeReceipt(prior,true)):fail('receipt_identity_conflict',409)
 if(mode==='receipt')return fail('receipt_not_found',404)
 const proof=await signed(env.DOCUMENT_STUDY_HOMEFLOW_SERVICE,
  env.DOCUMENT_STUDY_PROOF_SECRET!,'it-study-platform:execution-proof',
  'it-study-platform','/api/internal/approvals/verify',
  {...Object.fromEntries(core.map(x=>[x==='request_id'?'request_id':x,b[x]])),
   idempotency_key:'jpda:sync:'+b.resource_id,
   expected_version:null,purpose:'execute',execution_nonce:b.execution_nonce})
 if(!proof||proof.ok!==true||proof.verified!==true||
  proof.execution_authorized!==true||proof.execution_status!=='executing'||
  proof.source_app!=='jp-document-assistant'||proof.target_app!=='it-study-platform'||
  proof.operation!=='document.sync.study'||proof.resource_type!=='document_sync_candidate'||
  proof.request_id!==b.request_id||proof.resource_id!==b.resource_id||
  proof.household_id!==b.household_id||proof.requester_user_id!==b.requester_user_id||
  proof.payload_sha256!==b.payload_sha256||
  proof.idempotency_key!=='jpda:sync:'+b.resource_id||
  proof.expected_version!==null||proof.applied!==false||
  !proof.approver_user_id||proof.approver_user_id===b.requester_user_id||
  !Number.isSafeInteger(proof.approved_at)||!Number.isSafeInteger(proof.expires_at)||
  proof.expires_at<=Date.now())return fail('homeflow_execution_proof_invalid',409)
 const source=await signed(env.DOCUMENT_STUDY_SOURCE_SERVICE,
  env.DOCUMENT_STUDY_SOURCE_SECRET!,'it-study:document-source-check',
  'it-study-platform','/api/internal/document-actions/study-source-check',
  {...Object.fromEntries(core.map(x=>[x,b[x]])),execution_nonce:b.execution_nonce})
 if(!source||source.ok!==true||source.verified!==true||
  source.approval_id!==b.request_id||source.candidate_id!==b.resource_id||
  source.household_id!==b.household_id||source.requester_user_id!==b.requester_user_id||
  source.payload_sha256!==b.payload_sha256||
  source.reserved!==true||source.snapshot_sha256!==b.payload_sha256||
  source.execution_nonce_hash!==await (async()=>{
   const data=await crypto.subtle.digest('SHA-256',enc.encode(b.execution_nonce))
   return Array.from(new Uint8Array(data),x=>x.toString(16).padStart(2,'0')).join('')
  })())return fail('document_study_source_invalid',409)
 // The source snapshot and approval SHA are byte-identical; neither is
 // transmitted to HomeFlow, including private words, sentences or notes.
 const written=await applyVerifiedDocumentStudy(env.DB,{
  approval_id:b.request_id,candidate_id:b.resource_id,household_id:b.household_id,
  requester_user_id:b.requester_user_id,payload_sha256:b.payload_sha256,
  snapshot:b.snapshot,approver_user_id:proof.approver_user_id})
 if(!written?.ok||!written.applied||!written.receipt)return fail(
  'document_study_target_'+String(written?.code||'unconfirmed'),409)
 const receipt=await original(env.DB,b)
 if(!receipt||!identical(receipt,b)||
  receipt.approver_user_id!==proof.approver_user_id)
  return fail('document_study_receipt_unconfirmed',503)
 return reply(safeReceipt(receipt,written.replayed===true))
}
