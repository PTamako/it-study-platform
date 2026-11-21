import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {DatabaseSync} from 'node:sqlite'

test('FE exercises are distinct, well-formed and repeatable',()=>{
 const db=new DatabaseSync(':memory:')
 try {
  db.exec(`PRAGMA foreign_keys=ON;
   CREATE TABLE questions(id TEXT PRIMARY KEY,track_id TEXT,topic TEXT,difficulty TEXT,question_type TEXT,prompt TEXT,options_json TEXT,answer_json TEXT,explanation TEXT,source_type TEXT,source_reference TEXT,language TEXT,exam_section TEXT,exam_section_method TEXT,question_kind TEXT,exam_origin TEXT);
   CREATE TABLE study_attempts(id TEXT PRIMARY KEY,question_id TEXT REFERENCES questions(id));
   INSERT INTO questions(id,track_id) VALUES('existing','exam-fe'); INSERT INTO study_attempts VALUES('keep','existing');`)
  const sql=readFileSync(new URL('../migrations/0210_fe_original_practice_100_c.sql',import.meta.url),'utf8');db.exec(sql);db.exec(sql)
  const rows=db.prepare("SELECT * FROM questions WHERE id LIKE 'fe-original-20261121-c-%' ORDER BY id").all()
  assert.equal(rows.length,100);assert.equal(new Set(rows.map(r=>r.prompt)).size,100)
  for(const r of rows){const o=JSON.parse(r.options_json),a=JSON.parse(r.answer_json);assert.equal(r.source_type,'generated');assert.equal(r.track_id,'exam-fe');assert.match(r.source_reference,/IPA公式過去問ではありません/);assert.match(r.explanation,/中文：/);assert.deepEqual(o.map(x=>x.id),['a','b','c','d']);assert.equal(new Set(o.map(x=>x.text)).size,4);assert.ok(o.some(x=>x.id===a))}
  const choice=n=>{const r=rows[n-1];return JSON.parse(r.options_json).find(o=>o.id===JSON.parse(r.answer_json)).text}
  for(const [n,value] of [[1,'3'],[2,'6'],[3,'36'],[4,'24'],[5,'商3、余り2'],[6,'3'],[9,'8'],[19,'[1,4,5]'],[20,'6'],[21,'3'],[22,'12'],[41,'/26'],[42,'30'],[62,'128'],[63,'15'],[64,'100000'],[65,'255'],[78,'99.5%'],[81,'7日'],[82,'5日'],[83,'2日'],[87,'10万円'],[91,'300円'],[92,'増加する'],[93,'20万円'],[94,'25%'],[99,'20%'],[100,'80万円']]) assert.equal(choice(n),value)
  assert.equal(db.prepare('SELECT count(*) n FROM study_attempts').get().n,1);assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(),[])
 }finally{db.close()}
})
