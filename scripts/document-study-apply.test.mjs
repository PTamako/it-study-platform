import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {pathToFileURL} from 'node:url'
import {DatabaseSync} from 'node:sqlite'
import {createHash,webcrypto} from 'node:crypto'
if(!globalThis.crypto)globalThis.crypto=webcrypto
const dir=mkdtempSync(join(tmpdir(),'document-study-apply-'))
writeFileSync(join(dir,'apply.mts'),readFileSync(new URL('../worker/document-study-apply.ts',import.meta.url),'utf8'))
const {applyVerifiedDocumentStudy}=await import(pathToFileURL(join(dir,'apply.mts')))
process.on('exit',()=>rmSync(dir,{recursive:true,force:true}))
function fixture(){
 const sql=new DatabaseSync(':memory:');sql.exec('PRAGMA foreign_keys=ON')
 for(const file of ['0180_homeflow_identity_isolation.sql','0181_homeflow_user_vocabulary.sql',
  '0190_homeflow_personal_sentence_cards.sql','0191_homeflow_document_study_receipts.sql'])
  sql.exec(readFileSync(new URL('../migrations/'+file,import.meta.url),'utf8'))
 sql.exec("INSERT INTO homeflow_identity_links VALUES('member-a','family','member','A','active',1),('member-b','family','member','B','active',1)")
 const db={prepare(statement){const b=(values=[])=>({
  first:async()=>sql.prepare(statement).get(...values)||null,
  all:async()=>({results:sql.prepare(statement).all(...values)}),
  run:async()=>({meta:{changes:Number(sql.prepare(statement).run(...values).changes)}}),
  runSync:()=>({meta:{changes:Number(sql.prepare(statement).run(...values).changes)}})
 });return {...b(),bind:(...v)=>b(v)}},async batch(items){
  sql.exec('BEGIN');try{const x=items.map(i=>i.runSync());sql.exec('COMMIT');return x}
  catch(e){sql.exec('ROLLBACK');throw e}
 }}
 return {sql,db}
}
const make=(actor,candidate,approval,payload)=>{
 const snapshot=JSON.stringify({source_document_id:'doc',source_candidate_id:candidate,
  source_document_version:1,candidate_updated_at:'2026-11-14T00:00:00Z',
  candidate_kind:payload.operation,homeflow_user_id:actor,homeflow_household_id:'family',
  target_app:'it-study-platform',payload})
 return {approval_id:approval,candidate_id:candidate,household_id:'family',requester_user_id:actor,
  payload_sha256:createHash('sha256').update(snapshot).digest('hex'),snapshot}
}
const sentence={operation:'sentence',language:'ja',sentence:'確認します',meaning_zh:'确认',privacy_confirmed:true,skip_existing:true}
const vocabulary={operation:'vocabulary',language:'ja',term:'確認',reading:'かくにん',meaning_zh:'确认',skip_existing:true}
const aid='11111111-1111-4111-8111-111111111111',bid='22222222-2222-4222-8222-222222222222'
test('document sentence target writes and journals atomically under the requested member, with isolated same sentence',async()=>{
 const f=fixture();try{
  const a=make('member-a','a'.repeat(32),aid,sentence),b=make('member-b','b'.repeat(32),bid,sentence)
  const first=await applyVerifiedDocumentStudy(f.db,a);assert.equal(first.ok,true)
  assert.equal(first.receipt.effect,'created');assert.equal((await applyVerifiedDocumentStudy(f.db,a)).replayed,true)
  assert.equal((await applyVerifiedDocumentStudy(f.db,b)).ok,true)
  const cards=f.sql.prepare('SELECT homeflow_user_id,sentence_text,source_kind FROM homeflow_personal_sentence_cards ORDER BY homeflow_user_id').all()
  assert.deepEqual(cards.map(x=>({...x})),[
   {homeflow_user_id:'member-a',sentence_text:'確認します',source_kind:'document'},
   {homeflow_user_id:'member-b',sentence_text:'確認します',source_kind:'document'}])
  assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM homeflow_personal_sentence_events').get().n,2)
  assert.throws(()=>f.sql.prepare('UPDATE homeflow_document_study_receipts SET remote_id=?').run('x'),/IMMUTABLE/)
  assert.equal((await applyVerifiedDocumentStudy(f.db,{...a,requester_user_id:'member-b'})).applied,false)
  assert.equal((await applyVerifiedDocumentStudy(f.db,{...a,payload_sha256:'f'.repeat(64)})).applied,false)
  const reused=make('member-b','a'.repeat(32),'33333333-3333-4333-8333-333333333333',sentence)
  assert.equal((await applyVerifiedDocumentStudy(f.db,reused)).code,'RECEIPT_IDENTITY_CONFLICT')
  const privateData=make('member-b','d'.repeat(32),'44444444-4444-4444-8444-444444444444',
   {...sentence,sentence:'電話 09012345678'})
  assert.equal((await applyVerifiedDocumentStudy(f.db,privateData)).code,'INVALID_SNAPSHOT')
  f.sql.prepare("UPDATE homeflow_identity_links SET state='revoked' WHERE homeflow_user_id='member-a'").run()
  assert.equal((await applyVerifiedDocumentStudy(f.db,a)).code,'MEMBER_SCOPE_INVALID')
 }finally{f.sql.close()}
})
test('document vocabulary preserves existing private entries and never revives removed words',async()=>{
 const f=fixture();try{
  f.sql.prepare("INSERT INTO homeflow_saved_vocabulary VALUES('member-a','ja','確認',?,0,'member-a','2026-01-01')")
   .run(JSON.stringify({meaning_zh:'私人的备注'}))
  const a=make('member-a','a'.repeat(32),aid,vocabulary),b=make('member-b','b'.repeat(32),bid,vocabulary)
  const result=await applyVerifiedDocumentStudy(f.db,a)
  assert.equal(result.receipt.effect,'already_present')
  assert.match(f.sql.prepare("SELECT entry_json FROM homeflow_saved_vocabulary WHERE homeflow_user_id='member-a'").get().entry_json,/私人的备注/)
  assert.equal((await applyVerifiedDocumentStudy(f.db,b)).receipt.effect,'created')
  assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM homeflow_saved_vocabulary').get().n,2)
  assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM homeflow_vocabulary_events').get().n,1)
  f.sql.prepare("UPDATE homeflow_saved_vocabulary SET is_deleted=1 WHERE homeflow_user_id='member-a'").run()
  const another=make('member-a','c'.repeat(32),'33333333-3333-4333-8333-333333333333',vocabulary)
  assert.equal((await applyVerifiedDocumentStudy(f.db,another)).code,'VOCABULARY_REMOVED')
  assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM homeflow_document_study_receipts').get().n,2)
 }finally{f.sql.close()}
})
test('journal failure rolls back both the document sentence and its audit',async()=>{
 const f=fixture();try{
  f.sql.exec("CREATE TRIGGER injected_failure BEFORE INSERT ON homeflow_document_study_receipts BEGIN SELECT RAISE(ABORT,'injected'); END")
  const a=make('member-a','a'.repeat(32),aid,sentence)
  assert.equal((await applyVerifiedDocumentStudy(f.db,a)).applied,false)
  for(const table of ['homeflow_personal_sentence_cards','homeflow_personal_sentence_events','homeflow_document_study_receipts'])
   assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM '+table).get().n,0)
  f.sql.exec('DROP TRIGGER injected_failure')
  assert.equal((await applyVerifiedDocumentStudy(f.db,a)).ok,true)
 }finally{f.sql.close()}
})
test('journal failure also rolls back newly inserted vocabulary',async()=>{
 const f=fixture();try{
  f.sql.exec("CREATE TRIGGER injected_failure BEFORE INSERT ON homeflow_document_study_receipts BEGIN SELECT RAISE(ABORT,'injected'); END")
  assert.equal((await applyVerifiedDocumentStudy(f.db,make('member-a','a'.repeat(32),aid,vocabulary))).applied,false)
  for(const table of ['homeflow_saved_vocabulary','homeflow_vocabulary_events','homeflow_document_study_receipts'])
   assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM '+table).get().n,0)
 }finally{f.sql.close()}
})
