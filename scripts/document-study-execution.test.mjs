import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {pathToFileURL} from 'node:url'
import {DatabaseSync} from 'node:sqlite'
import {createHash,createHmac,webcrypto} from 'node:crypto'
if(!globalThis.crypto)globalThis.crypto=webcrypto
const dir=mkdtempSync(join(tmpdir(),'study-document-execution-'))
writeFileSync(join(dir,'document-study-apply.mts'),
 readFileSync(new URL('../worker/document-study-apply.ts',import.meta.url),'utf8'))
writeFileSync(join(dir,'document-study-execution.mts'),
 readFileSync(new URL('../worker/document-study-execution.ts',import.meta.url),'utf8')
  .replace("'./document-study-apply'","'./document-study-apply.mts'"))
const {documentStudyExecution}=await import(pathToFileURL(join(dir,'document-study-execution.mts')))
process.on('exit',()=>rmSync(dir,{recursive:true,force:true}))
const keys={execute:'1'.repeat(64),proof:'2'.repeat(64),source:'3'.repeat(64)}
const hh='family',member='member-a',owner='owner',member2='member-b'
const approval='11111111-1111-4111-8111-111111111111'
const candidate='a'.repeat(32),nonce='4'.repeat(64)
const hashed=raw=>createHash('sha256').update(raw).digest('hex')
const hmac=(domain,key,stamp,raw)=>createHmac('sha256',Buffer.from(key,'hex'))
 .update(domain+'\n'+stamp+'\n'+raw).digest('hex')
function store(){
 const sql=new DatabaseSync(':memory:');sql.exec('PRAGMA foreign_keys=ON')
 for(const f of ['0180_homeflow_identity_isolation.sql','0181_homeflow_user_vocabulary.sql',
  '0190_homeflow_personal_sentence_cards.sql','0191_homeflow_document_study_receipts.sql',
  '0192_homeflow_document_study_approver_audit.sql'])
  sql.exec(readFileSync(new URL('../migrations/'+f,import.meta.url),'utf8'))
 sql.exec("INSERT INTO homeflow_identity_links VALUES('member-a','family','member','Member A','active',1),('member-b','family','member','Member B','active',1),('owner','family','owner','Owner','active',1),('stranger','other','owner','Foreign','active',1)")
 const db={prepare(query){return{bind(...args){return{
  first:async()=>sql.prepare(query).get(...args)||null,
  run:async()=>({meta:{changes:sql.prepare(query).run(...args).changes}}),
  sync:()=>({meta:{changes:sql.prepare(query).run(...args).changes}})
 }}}},async batch(statements){
  sql.exec('BEGIN IMMEDIATE')
  try{const r=statements.map(x=>x.sync());sql.exec('COMMIT');return r}
  catch(e){sql.exec('ROLLBACK');throw e}
 }}
 return {db,sql}
}
const term={operation:'vocabulary',language:'ja',term:'確認',reading:'かくにん',
 meaning_zh:'确认',skip_existing:true}
const sentence={operation:'sentence',language:'ja',sentence:'確認します。',
 meaning_zh:'我确认。',privacy_confirmed:true,skip_existing:true}
const make=(user=member,kind=term,reqId=approval,cid=candidate)=>{
 const snapshot=JSON.stringify({source_document_id:'a-private-document',
  source_candidate_id:cid,source_document_version:1,
  candidate_updated_at:'2026-11-14T00:00:00.000Z',
  candidate_kind:kind.operation,homeflow_user_id:user,
  homeflow_household_id:hh,target_app:'it-study-platform',payload:kind})
 return {request_id:reqId,resource_id:cid,household_id:hh,
  requester_user_id:user,payload_sha256:hashed(snapshot),execution_nonce:nonce,snapshot}
}
function send(mode,payload,extraHeaders={},stamp=String(Date.now())){
 const raw=JSON.stringify(payload)
 return new Request('https://study.invalid/api/internal/document-study/'+mode,{
  method:'POST',headers:{'content-type':'application/json',
   'x-approval-client':'jp-document-assistant','x-approval-timestamp':stamp,
   'x-approval-signature':hmac('jpda:study-'+mode,keys.execute,stamp,raw),
   ...extraHeaders},body:raw})
}
function fixture(){
 const {sql,db}=store(),counter={homeflow:0,source:0},env={
  DB:db,APP_ENV:'production',DOCUMENT_STUDY_EXECUTION_ENABLED:'true',
  DOCUMENT_STUDY_EXECUTION_SECRET:keys.execute,
  DOCUMENT_STUDY_PROOF_SECRET:keys.proof,DOCUMENT_STUDY_SOURCE_SECRET:keys.source
 }
 env.DOCUMENT_STUDY_HOMEFLOW_SERVICE={async fetch(req){
  counter.homeflow++
  assert.equal(new URL(req.url).pathname,'/api/internal/approvals/verify')
  assert.equal(req.headers.get('origin'),null)
  const raw=await req.text(),stamp=req.headers.get('x-approval-timestamp')
  assert.equal(req.headers.get('x-approval-client'),'it-study-platform')
  assert.equal(req.headers.get('x-approval-signature'),
   hmac('it-study-platform:execution-proof',keys.proof,stamp,raw))
  const b=JSON.parse(raw)
  assert.equal(b.purpose,'execute')
  assert.equal(b.idempotency_key,'jpda:sync:'+b.resource_id)
  assert.equal(b.execution_nonce,nonce)
  assert.doesNotMatch(raw,/確認|a-private-document/)
  return Response.json({ok:true,verified:true,execution_authorized:true,
   execution_status:'executing',source_app:'jp-document-assistant',
   target_app:'it-study-platform',operation:'document.sync.study',
   resource_type:'document_sync_candidate',request_id:b.request_id,
   resource_id:b.resource_id,household_id:b.household_id,
   requester_user_id:b.requester_user_id,payload_sha256:b.payload_sha256,
   idempotency_key:b.idempotency_key,expected_version:null,
   applied:false,approver_user_id:owner,approved_at:Date.now()-1000,
   expires_at:Date.now()+600000})
 }}
 env.DOCUMENT_STUDY_SOURCE_SERVICE={async fetch(req){
  counter.source++
  assert.equal(new URL(req.url).pathname,'/api/internal/document-actions/study-source-check')
  assert.equal(req.headers.get('origin'),null)
  assert.equal(req.headers.get('x-approval-client'),'it-study-platform')
  const raw=await req.text(),stamp=req.headers.get('x-approval-timestamp')
  assert.equal(req.headers.get('x-approval-signature'),
   hmac('it-study:document-source-check',keys.source,stamp,raw))
  const b=JSON.parse(raw)
  assert.deepEqual(Object.keys(b).sort(),
   ['request_id','resource_id','household_id','requester_user_id','payload_sha256'].sort())
  assert.doesNotMatch(raw,/確認|a-private-document/)
  return Response.json({ok:true,verified:true,
   approval_id:b.request_id,candidate_id:b.resource_id,
   household_id:b.household_id,requester_user_id:b.requester_user_id,
   payload_sha256:b.payload_sha256})
 }}
 const execute=async(p=make(),extra={})=>{
  const r=await documentStudyExecution(send('execute',p,extra),env)
  return {status:r.status,body:await r.json()}
 }
 const receipt=async(p=make())=>{
  const {snapshot,execution_nonce,...core}=p
  const r=await documentStudyExecution(send('receipt',core),env)
  return {status:r.status,body:await r.json()}
 }
 return {sql,db,env,counter,execute,receipt,close(){sql.close()}}
}
test('signed study document vocabulary: real D1 receipt and approver audit, replay without another source or lease call',async()=>{
 const f=fixture()
 try{
  const applied=await f.execute()
  assert.equal(applied.status,200,JSON.stringify(applied))
  assert.equal(applied.body.applied,true)
  assert.equal(applied.body.kind,'vocabulary')
  const a=f.sql.prepare('SELECT * FROM homeflow_saved_vocabulary').get()
  assert.equal(a.homeflow_user_id,member)
  assert.equal(a.term,term.term)
  const journal=f.sql.prepare('SELECT * FROM homeflow_document_study_receipts').get()
  assert.equal(journal.requester_user_id,member)
  const audit=f.sql.prepare('SELECT * FROM homeflow_document_study_approval_audit').get()
  assert.equal(audit.requester_user_id,member)
  assert.equal(audit.approver_user_id,owner)
  const replay=await f.execute()
  assert.equal(replay.status,200)
  assert.equal(replay.body.already_applied,true)
  assert.equal(f.counter.homeflow,1)
  assert.equal(f.counter.source,1)
  const recovered=await f.receipt()
  assert.equal(recovered.body.applied,true)
  assert.equal(recovered.body.remote_id,journal.remote_id)
  assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM homeflow_saved_vocabulary').get().n,1)
  assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM homeflow_document_study_approval_audit').get().n,1)
  assert.throws(()=>f.sql.prepare('DELETE FROM homeflow_document_study_approval_audit').run(),/IMMUTABLE/)
 }finally{f.close()}
})
test('signed private sentence creates only requesting member card, no content sent into approval proof',async()=>{
 const f=fixture()
 try{
  const s=await f.execute(make(member,sentence))
  assert.equal(s.status,200,JSON.stringify(s))
  assert.equal(s.body.applied,true)
  assert.equal(s.body.kind,'sentence')
  assert.equal(f.sql.prepare('SELECT homeflow_user_id FROM homeflow_personal_sentence_cards').get().homeflow_user_id,member)
  assert.equal(f.sql.prepare('SELECT approver_user_id FROM homeflow_document_study_approval_audit').get().approver_user_id,owner)
  assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM homeflow_vocabulary_events').get().n,0)
 }finally{f.close()}
})
test('wrong family, revoked member, PII, disabled executor, forged signature all refuse target write',async()=>{
 for(const caseName of ['wrong-family','revoked','PII','disabled','signature','browser','proof-offline','source-offline']){
  const f=fixture()
  try{
   const p=make()
   if(caseName==='wrong-family')p.household_id='another-household'
   if(caseName==='revoked')f.sql.prepare("UPDATE homeflow_identity_links SET state='revoked' WHERE homeflow_user_id=?").run(member)
   if(caseName==='PII'){
    p.snapshot=make(member,{...term,term:'電話09012345678'}).snapshot
    p.payload_sha256=hashed(p.snapshot)
   }
   if(caseName==='disabled')f.env.DOCUMENT_STUDY_EXECUTION_ENABLED='false'
   if(caseName==='proof-offline')f.env.DOCUMENT_STUDY_HOMEFLOW_SERVICE={async fetch(){throw Error('offline')}}
   if(caseName==='source-offline')f.env.DOCUMENT_STUDY_SOURCE_SERVICE={async fetch(){throw Error('offline')}}
   const attempt=caseName==='signature'||caseName==='browser'?
    await documentStudyExecution(send('execute',p,caseName==='signature'?
     {'x-approval-signature':'f'.repeat(64)}:{origin:'https://attacker.invalid'}),f.env):
    await documentStudyExecution(send('execute',p),f.env)
   assert.notEqual(attempt.status,200,caseName)
   assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM homeflow_document_study_receipts').get().n,0,caseName)
   assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM homeflow_saved_vocabulary').get().n,0,caseName)
  }finally{f.close()}
 }
})
test('two users same word keep independent cards; forged reused approval never crosses member identity',async()=>{
 const f=fixture()
 try{
  assert.equal((await f.execute(make())).status,200)
  const other=make(member2,term,'22222222-2222-4222-8222-222222222222','b'.repeat(32))
  const r=await f.execute(other)
  assert.equal(r.status,200,JSON.stringify(r))
  assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM homeflow_saved_vocabulary').get().n,2)
  assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM homeflow_document_study_approval_audit').get().n,2)
  assert.equal((await f.execute({...make(),requester_user_id:member2})).status,409)
  assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM homeflow_saved_vocabulary').get().n,2)
 }finally{f.close()}
})
test('failed approver audit INSERT rolls back vocabulary and journal in one real SQLite transaction',async()=>{
 const f=fixture()
 try{
  f.sql.exec("CREATE TRIGGER break_audit BEFORE INSERT ON homeflow_document_study_approval_audit BEGIN SELECT RAISE(ABORT,'injected audit'); END")
  const rejected=await f.execute()
  assert.equal(rejected.status,409,JSON.stringify(rejected))
  for(const table of ['homeflow_saved_vocabulary','homeflow_document_study_receipts',
   'homeflow_document_study_approval_audit'])
   assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM '+table).get().n,0)
  f.sql.exec('DROP TRIGGER break_audit')
  assert.equal((await f.execute()).status,200)
 }finally{f.close()}
})
test('original receipt can be read without re-execution after member revocation; no new private learning write',async()=>{
 const f=fixture()
 try{
  assert.equal((await f.execute()).status,200)
  f.sql.prepare("UPDATE homeflow_identity_links SET state='revoked' WHERE homeflow_user_id=?").run(member)
  const only=await f.receipt()
  assert.equal(only.status,200)
  assert.equal(only.body.applied,true)
  assert.equal(f.counter.homeflow,1)
  assert.equal(f.counter.source,1)
  assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM homeflow_saved_vocabulary').get().n,1)
 }finally{f.close()}
})
