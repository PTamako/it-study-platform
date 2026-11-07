import test from 'node:test'
import assert from 'node:assert/strict'
import { DatabaseSync } from 'node:sqlite'
import { readFileSync } from 'node:fs'
const migration=readFileSync(new URL('../migrations/0154_saved_vocabulary_by_language.sql',import.meta.url),'utf8')
test('language-aware migration preserves legacy words and deletion tombstones, repeatable without data loss',()=>{
 const db=new DatabaseSync(':memory:')
 try{
  db.exec(`CREATE TABLE saved_vocabulary_entries (
    term TEXT PRIMARY KEY,language TEXT NOT NULL,entry_json TEXT NOT NULL,saved_at TEXT DEFAULT CURRENT_TIMESTAMP);
    INSERT INTO saved_vocabulary_entries(term,language,entry_json) VALUES
    ('a','en','{"term":"a","language":"en"}'),
    ('b','ja','{"_zhixue_deleted_v1":true}');`)
  db.exec(migration);db.exec(migration)
  assert.equal(db.prepare('SELECT COUNT(*) n FROM saved_vocabulary_entries').get().n,2)
  assert.equal(db.prepare('SELECT COUNT(*) n FROM saved_vocabulary_entries_v2').get().n,2)
  db.prepare("INSERT INTO saved_vocabulary_entries_v2(language,term,entry_json) VALUES (?,?,?)")
    .run('ja','a','{"term":"a","language":"ja"}')
  assert.equal(db.prepare("SELECT COUNT(*) n FROM saved_vocabulary_entries_v2 WHERE term='a'").get().n,2)
  assert.match(db.prepare("SELECT entry_json FROM saved_vocabulary_entries_v2 WHERE language='ja' AND term='b'").get().entry_json,/_zhixue_deleted_v1/)
  assert.equal(db.prepare("SELECT COUNT(*) n FROM saved_vocabulary_entries").get().n,2)
 }finally{db.close()}
})
test('legacy table is never dropped or emptied by the new migration',()=>{
 assert.doesNotMatch(migration,/DROP TABLE|DELETE FROM|UPDATE saved_vocabulary_entries/i)
 assert.match(migration,/INSERT OR IGNORE INTO saved_vocabulary_entries_v2/)
})
