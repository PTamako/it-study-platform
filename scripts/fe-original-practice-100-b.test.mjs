import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {DatabaseSync} from 'node:sqlite'

test('new FE questions have unique prompts, valid answers, and are repeatable', () => {
 const db = new DatabaseSync(':memory:')
 try {
  db.exec(`PRAGMA foreign_keys=ON;
   CREATE TABLE questions(id TEXT PRIMARY KEY,track_id TEXT,topic TEXT,difficulty TEXT,question_type TEXT,prompt TEXT,options_json TEXT,answer_json TEXT,explanation TEXT,source_type TEXT,source_reference TEXT,language TEXT,exam_section TEXT,exam_section_method TEXT,question_kind TEXT,exam_origin TEXT);
   CREATE TABLE study_attempts(id TEXT PRIMARY KEY,question_id TEXT REFERENCES questions(id));
   INSERT INTO questions(id,track_id) VALUES('existing','exam-fe');
   INSERT INTO study_attempts VALUES('keep','existing');`)
  const sql=readFileSync(new URL('../migrations/0209_fe_original_practice_100_b.sql',import.meta.url),'utf8')
  db.exec(sql); db.exec(sql)
  const rows=db.prepare("SELECT * FROM questions WHERE id LIKE 'fe-original-20261121-b-%' ORDER BY id").all()
  assert.equal(rows.length,100)
  assert.equal(new Set(rows.map(r=>r.prompt)).size,100)
  for(const r of rows){
   const opts=JSON.parse(r.options_json), answer=JSON.parse(r.answer_json)
   assert.equal(r.track_id,'exam-fe');assert.equal(r.source_type,'generated')
   assert.match(r.source_reference,/IPA公式過去問ではありません/);assert.match(r.explanation,/中文：/)
   assert.deepEqual(opts.map(o=>o.id),['a','b','c','d']);assert.equal(new Set(opts.map(o=>o.text)).size,4)
   assert.ok(opts.some(o=>o.id===answer))
  }
  const selected=n=>{const r=rows[n-1];return JSON.parse(r.options_json).find(o=>o.id===JSON.parse(r.answer_json)).text}
  for(const [n,value] of [[1,'10'],[11,'22'],[12,'2D'],[14,'0110'],[18,'1/2'],[19,'0.64'],[20,'10'],[23,'0.81'],[24,'0.99'],[25,'90%'],[26,'20ns'],[27,'4秒'],[30,'25%'],[82,'500個']]) assert.equal(selected(n),value)
  assert.equal(db.prepare('SELECT count(*) n FROM study_attempts').get().n,1)
  assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(),[])
 } finally {db.close()}
})
