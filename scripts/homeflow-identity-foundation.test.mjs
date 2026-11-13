import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'

const sql=readFileSync(new URL('../migrations/0180_homeflow_identity_isolation.sql',import.meta.url),'utf8')
function baseline(){
 const db=new DatabaseSync(':memory:')
 db.exec('PRAGMA foreign_keys=ON;')
 db.exec("CREATE TABLE saved_vocabulary_entries_v2 (language TEXT NOT NULL,term TEXT NOT NULL,entry_json TEXT NOT NULL,PRIMARY KEY(language,term));")
 db.prepare("INSERT INTO saved_vocabulary_entries_v2 VALUES('ja','日本語','owner-private')")
  .run()
 return db
}
test('Stage B identity-only schema adds no changes to existing private study history',()=>{
 const db=baseline()
 try{
  const before=db.prepare('SELECT * FROM saved_vocabulary_entries_v2').all()
  db.exec(sql)
  assert.deepEqual(db.prepare('SELECT * FROM saved_vocabulary_entries_v2').all(),before)
  assert.equal(db.prepare('SELECT COUNT(*) n FROM homeflow_identity_links').get().n,0)
  assert.equal(db.prepare('SELECT COUNT(*) n FROM homeflow_identity_sessions').get().n,0)
  assert.equal(db.prepare('SELECT COUNT(*) n FROM homeflow_identity_audit').get().n,0)
  const names=db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'homeflow_%' ORDER BY name").all().map(x=>x.name)
  assert.deepEqual(names,['homeflow_identity_audit','homeflow_identity_links','homeflow_identity_sessions','homeflow_oauth_pending'])
 }finally{db.close()}
})
test('owner/member identities are immutable; no duplicate owner and no account swap',()=>{
 const db=baseline()
 try{
  db.exec(sql)
  const stmt=db.prepare("INSERT INTO homeflow_identity_links(homeflow_user_id,homeflow_household_id,role,display_name,created_at) VALUES(?,?,?,?,?)")
  stmt.run('owner-homeflow','primary','owner','昵称',1)
  stmt.run('member-homeflow','primary','member','成员',1)
  assert.throws(()=>stmt.run('fake-second-owner','primary','owner','假主人',2),/UNIQUE/)
  assert.throws(()=>db.prepare("UPDATE homeflow_identity_links SET role='owner' WHERE homeflow_user_id='member-homeflow'").run(),/immutable HomeFlow study identity/)
  assert.throws(()=>db.prepare("UPDATE homeflow_identity_links SET homeflow_user_id='other' WHERE homeflow_user_id='owner-homeflow'").run(),/immutable HomeFlow study identity/)
  assert.equal(db.prepare("SELECT display_name FROM homeflow_identity_links WHERE homeflow_user_id='owner-homeflow'").get().display_name,'昵称')
  assert.equal(db.prepare('SELECT COUNT(*) n FROM homeflow_identity_links').get().n,2)
 }finally{db.close()}
})
test('SSO audit/session writes must attribute a linked real actor, not a guessed owner',()=>{
 const db=baseline()
 try{
  db.exec(sql)
  assert.throws(()=>db.prepare("INSERT INTO homeflow_identity_audit VALUES('e','fabricated','account_linked',1)").run(),/FOREIGN KEY/)
  db.prepare("INSERT INTO homeflow_identity_links(homeflow_user_id,homeflow_household_id,role,display_name,created_at) VALUES('owner','primary','owner','owner',1)").run()
  db.prepare("INSERT INTO homeflow_identity_audit VALUES('e','owner','account_linked',1)").run()
  assert.equal(db.prepare("SELECT actor_user_id FROM homeflow_identity_audit WHERE event_id='e'").get().actor_user_id,'owner')
  assert.throws(()=>db.prepare("INSERT INTO homeflow_identity_sessions(token_hash,homeflow_user_id,assertion_cipher,assertion_iv,assertion_scope,expires_at,created_at) VALUES('fake','nobody','x','y','z',9,1)").run(),/FOREIGN KEY/)
 }finally{db.close()}
})
test('migration is idempotent and stores no user/progress fallback mappings',()=>{
 const db=baseline()
 try{
  db.exec(sql)
  db.exec(sql)
  assert.equal(db.prepare("SELECT COUNT(*) n FROM saved_vocabulary_entries_v2").get().n,1)
  for(const forbidden of ['UPDATE saved_vocabulary_entries_v2','DELETE FROM saved_vocabulary_entries_v2',
   'UPDATE language_card_progress','UPDATE exam_history','CREATE TABLE users']){
   assert.equal(sql.includes(forbidden),false)
  }
  assert.match(sql,/has_legacy_owner_proof/)
  assert.match(sql,/legacy_session_hash/)
  assert.match(sql,/proof_scope/)
 }finally{db.close()}
})
