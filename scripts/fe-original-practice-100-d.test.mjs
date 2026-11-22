import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {DatabaseSync} from 'node:sqlite'

test('original FE exercises have valid choices and preserve existing history',()=>{
 const db=new DatabaseSync(':memory:')
 try{
  db.exec(`PRAGMA foreign_keys=ON;
  CREATE TABLE questions(id TEXT PRIMARY KEY,track_id TEXT,topic TEXT,difficulty TEXT,question_type TEXT,prompt TEXT,options_json TEXT,answer_json TEXT,explanation TEXT,source_type TEXT,source_reference TEXT,language TEXT,exam_section TEXT,exam_section_method TEXT,question_kind TEXT,exam_origin TEXT);
  CREATE TABLE study_attempts(id TEXT PRIMARY KEY,question_id TEXT REFERENCES questions(id));
  INSERT INTO questions(id,track_id) VALUES('old','exam-fe');INSERT INTO study_attempts VALUES('keep','old');`)
  const sql=readFileSync(new URL('../migrations/0211_fe_original_practice_100_d.sql',import.meta.url),'utf8');db.exec(sql);db.exec(sql)
  const rows=db.prepare("SELECT * FROM questions WHERE id LIKE 'fe-original-20261121-d-%' ORDER BY id").all()
  assert.equal(rows.length,100);assert.equal(new Set(rows.map(r=>r.prompt)).size,100)
  for(const r of rows){const opts=JSON.parse(r.options_json),ans=JSON.parse(r.answer_json);assert.equal(r.track_id,'exam-fe');assert.equal(r.source_type,'generated');assert.match(r.source_reference,/IPA公式過去問ではありません/);assert.match(r.explanation,/中文：/);assert.deepEqual(opts.map(o=>o.id),['a','b','c','d']);assert.equal(new Set(opts.map(o=>o.text)).size,4);assert.ok(opts.some(o=>o.id===ans))}
  const selected=n=>{const r=rows[n-1];return JSON.parse(r.options_json).find(o=>o.id===JSON.parse(r.answer_json)).text}
  for(const [n,v] of [[1,'7'],[2,'3'],[3,'9'],[4,'60'],[5,'2'],[6,'7'],[10,'30'],[15,'O(n²)'],[21,'42'],[22,'11010'],[24,'11101010'],[26,'1/4'],[27,'3/10'],[29,'30'],[30,'5'],[31,'128'],[33,'10秒'],[61,'秒間100件'],[62,'25%'],[63,'50GB'],[64,'200時間'],[65,'80ms'],[66,'60件/秒'],[67,'16ns'],[68,'20件増える'],[70,'70%'],[88,'716.4時間'],[91,'40%'],[92,'2万円'],[93,'20万円'],[94,'5万円少ない'],[95,'7日'],[96,'7日'],[97,'6日'],[98,'25%'],[99,'2万円'],[100,'100万円']])assert.equal(selected(n),v)
  assert.equal(db.prepare('SELECT count(*) n FROM study_attempts').get().n,1);assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(),[])
 }finally{db.close()}
})
