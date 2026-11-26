import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {DatabaseSync} from 'node:sqlite'
import {createHmac,webcrypto} from 'node:crypto'
import ts from 'typescript'

if(!globalThis.crypto)globalThis.crypto=webcrypto
const owner='11111111-1111-4111-8111-111111111111'
const member='22222222-2222-4222-8222-222222222222'
const secret='bridge-signing-secret-for-zhixue-owner-document-123'
const src=readFileSync(new URL('../worker/index.ts',import.meta.url),'utf8')
const start=src.indexOf('const bridgeEnc=new TextEncoder()')
const end=src.indexOf('// Read-only, explicit-consent Japanese',start)
assert.ok(start>0&&end>start)
const hashHelper=`async function dictionaryAiHash(value:string){
 const d=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))
 return Array.from(d,x=>x.toString(16).padStart(2,'0')).join('')
}\n`
const js=ts.transpileModule(hashHelper+src.slice(start,end),{
 compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}
}).outputText
const bridge=(new Function('crypto','exports',js+'\nreturn documentAssistantBridge;'))(globalThis.crypto,{})
function fixture(){
 const raw=new DatabaseSync(':memory:')
 raw.exec('PRAGMA foreign_keys=ON;')
 for(const file of ['0180_homeflow_identity_isolation.sql',
  '0181_homeflow_user_vocabulary.sql','0190_homeflow_personal_sentence_cards.sql'])
  raw.exec(readFileSync(new URL('../migrations/'+file,import.meta.url),'utf8'))
 const add=raw.prepare('INSERT INTO homeflow_identity_links(homeflow_user_id,homeflow_household_id,role,display_name,created_at) VALUES(?,?,?,?,?)')
 add.run(owner,'family','owner','管理员',Date.now())
 add.run(member,'family','member','家庭成员',Date.now())
 const DB={
  prepare(sql){
   return {all:async()=>({results:raw.prepare(sql).all()}),bind(...args){return {
    first:async()=>raw.prepare(sql).get(...args)||null,
    all:async()=>({results:raw.prepare(sql).all(...args)}),
    run:async()=>({meta:{changes:raw.prepare(sql).run(...args).changes}}),
    runSync:()=>({meta:{changes:raw.prepare(sql).run(...args).changes}})
   }}}
  },
  async batch(statements){
   raw.exec('BEGIN')
   try{const result=statements.map(x=>x.runSync());raw.exec('COMMIT');return result}
   catch(e){raw.exec('ROLLBACK');throw e}
  }
 }
 return {raw,env:{DB,HOMEFLOW_STUDY_SSO_ENABLED:'true',JPDA_BRIDGE_ENABLED:'true',
  JPDA_BRIDGE_SECRET:secret,JPDA_BRIDGE_STUDY_ACTOR_ID:owner}}
}
function request(actor,operation,suffix,identitySource=false,sentenceText='今日は進捗をご報告します。'){
 const payload=operation==='sentence'
  ?{operation,language:'ja',sentence:sentenceText,meaning_zh:'今天报告进度',skip_existing:true,privacy_confirmed:true}
  :{operation,language:'ja',term:'進捗',reading:'しんちょく',meaning_zh:'进度',skip_existing:true}
 const packet={source:'jp-document-assistant',actor_user_id:actor,
  ...(identitySource?{identity_source:'homeflow_sso'}:{}),
  idempotency_key:'jda:zhixue:'+suffix,payload}
 const raw=JSON.stringify(packet),stamp=String(Date.now())
 const sig=createHmac('sha256',secret).update(stamp+'\n'+raw).digest('hex')
 return new Request('https://study.example.test/api/bridge/document-assistant',{
  method:'POST',headers:{'Content-Type':'application/json',
   'X-DA-Timestamp':stamp,'X-DA-Signature':sig,
   'Idempotency-Key':packet.idempotency_key},body:raw})
}
test('signed owner word sync writes only their HomeFlow space and audits once',async()=>{
 const f=fixture()
 try{
  const key='a'.repeat(32)
  const first=await bridge(request(owner,'vocabulary',key),f.env)
  assert.equal(first.status,200,await first.clone().text())
  assert.equal((await first.json()).reused,false)
  const again=await bridge(request(owner,'vocabulary',key),f.env)
  assert.equal(again.status,200)
  assert.equal((await again.json()).reused,true)
  assert.equal(f.raw.prepare('SELECT COUNT(*) n FROM homeflow_saved_vocabulary WHERE homeflow_user_id=?').get(owner).n,1)
  assert.equal(f.raw.prepare('SELECT COUNT(*) n FROM homeflow_saved_vocabulary WHERE homeflow_user_id=?').get(member).n,0)
  assert.equal(f.raw.prepare('SELECT COUNT(*) n FROM homeflow_vocabulary_events').get().n,1)
  assert.equal((await bridge(request(member,'vocabulary','b'.repeat(32)),f.env)).status,403)
  assert.equal(f.raw.prepare('SELECT COUNT(*) n FROM homeflow_saved_vocabulary').get().n,1)
  // The old approved bridge actor alias is not necessarily a HomeFlow UUID.
  f.env.JPDA_BRIDGE_STUDY_ACTOR_ID='legacy-owner-actor'
  const oldAlias=await bridge(request('legacy-owner-actor','vocabulary','e'.repeat(32)),f.env)
  assert.equal(oldAlias.status,200,await oldAlias.clone().text())
  assert.equal(f.raw.prepare('SELECT COUNT(*) n FROM homeflow_saved_vocabulary WHERE homeflow_user_id=?').get(owner).n,1)

 }finally{f.raw.close()}
})
test('owner document sentence has stable 32-char ID, rejects changed candidate and isolates member',async()=>{
 const f=fixture()
 try{
  const key='c'.repeat(32)
  const saved=await bridge(request(owner,'sentence',key),f.env)
  assert.equal(saved.status,200,await saved.clone().text())
  const repeat=await bridge(request(owner,'sentence',key),f.env)
  assert.equal((await repeat.json()).reused,true)
  const row=f.raw.prepare('SELECT homeflow_user_id,card_id,sentence_text FROM homeflow_personal_sentence_cards').get()
  assert.equal(row.homeflow_user_id,owner)
  assert.equal(row.card_id.length,32)
  assert.equal(f.raw.prepare('SELECT COUNT(*) n FROM homeflow_personal_sentence_events').get().n,1)
  assert.equal((await bridge(request(member,'sentence','d'.repeat(32)),f.env)).status,403)
  assert.throws(()=>f.raw.prepare('DELETE FROM homeflow_personal_sentence_events').run(),/IMMUTABLE_SENTENCE_AUDIT/)
 }finally{f.raw.close()}
})

test('verified member signs into own wordbook and sentence space without family review',async()=>{
 const f=fixture()
 try{
  const word=await bridge(request(member,'vocabulary','f'.repeat(32),true),f.env)
  assert.equal(word.status,200,await word.clone().text())
  const sentence=await bridge(request(member,'sentence','1'.repeat(32),true),f.env)
  assert.equal(sentence.status,200,await sentence.clone().text())
  const repeated=await bridge(request(member,'sentence','1'.repeat(32),true),f.env)
  assert.equal((await repeated.json()).reused,true)
  assert.equal(f.raw.prepare('SELECT COUNT(*) n FROM homeflow_saved_vocabulary WHERE homeflow_user_id=?').get(member).n,1)
  assert.equal(f.raw.prepare('SELECT COUNT(*) n FROM homeflow_personal_sentence_cards WHERE homeflow_user_id=?').get(member).n,1)
  assert.equal(f.raw.prepare('SELECT COUNT(*) n FROM homeflow_saved_vocabulary WHERE homeflow_user_id=?').get(owner).n,0)
  assert.equal(f.raw.prepare('SELECT COUNT(*) n FROM homeflow_personal_sentence_cards WHERE homeflow_user_id=?').get(owner).n,0)
  // A signed SSO claim for a non-existent identity must not create any record.
  const stranger='33333333-3333-4333-8333-333333333333'
  assert.equal((await bridge(request(stranger,'vocabulary','2'.repeat(32),true),f.env)).status,403)
  assert.equal(f.raw.prepare('SELECT COUNT(*) n FROM homeflow_saved_vocabulary').get().n,1)
 }finally{f.raw.close()}
})

test('concurrent sentence requests with the same key but different payloads cannot both succeed',async()=>{
 const f=fixture()
 try{
  const key='3'.repeat(32)
  const originalBatch=f.env.DB.batch.bind(f.env.DB)
  let competingResponse
  let inserted=false
  f.env.DB.batch=async statements=>{
   if(!inserted){
    inserted=true
    competingResponse=await bridge(request(owner,'sentence',key,true,'明日ご連絡します。'),f.env)
   }
   return originalBatch(statements)
  }
  const loser=await bridge(request(owner,'sentence',key,true),f.env)
  assert.equal(competingResponse.status,200)
  assert.equal(loser.status,409,await loser.clone().text())
  assert.equal((await loser.json()).error,'study_idempotency_conflict')
  assert.equal(f.raw.prepare('SELECT sentence_text FROM homeflow_personal_sentence_cards').get().sentence_text,'明日ご連絡します。')
  assert.equal(f.raw.prepare('SELECT COUNT(*) n FROM homeflow_personal_sentence_events').get().n,1)
  const replay=await bridge(request(owner,'sentence',key,true,'明日ご連絡します。'),f.env)
  assert.equal(replay.status,200)
  assert.equal((await replay.json()).reused,true)
 }finally{f.raw.close()}
})
