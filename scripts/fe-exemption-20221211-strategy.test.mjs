import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {DatabaseSync} from 'node:sqlite'

test('IPA December 2022 strategy questions match official answers and preserve study records',()=>{
 const db=new DatabaseSync(':memory:')
 try {
  db.exec(`PRAGMA foreign_keys=ON;
   CREATE TABLE questions(id TEXT PRIMARY KEY,track_id TEXT,topic TEXT,difficulty TEXT,question_type TEXT,prompt TEXT,options_json TEXT,answer_json TEXT,explanation TEXT,source_type TEXT,source_reference TEXT,language TEXT,exam_section TEXT,exam_section_method TEXT,question_kind TEXT,exam_origin TEXT);
   CREATE TABLE fe_exemption_occurrences(sitting_date TEXT,original_question INTEGER,fiscal_year TEXT,canonical_question_id TEXT REFERENCES questions(id),official_answer TEXT,question_url TEXT,answer_url TEXT,PRIMARY KEY(sitting_date,original_question));
   CREATE TABLE study_attempts(id TEXT PRIMARY KEY,question_id TEXT REFERENCES questions(id)); INSERT INTO questions(id) VALUES('prior'); INSERT INTO questions(id,answer_json,options_json,explanation) VALUES('fe-ipa-sample-2022-a-050','"a"','[{"id":"a"},{"id":"b"},{"id":"c"},{"id":"d"}]','中文'),('fe-ipa-sample-2022-a-053','"d"','[{"id":"a"},{"id":"b"},{"id":"c"},{"id":"d"}]','中文'),('fe-ipa-official-2023-a-17','"c"','[{"id":"a"},{"id":"b"},{"id":"c"},{"id":"d"}]','日本語の既存説明'); INSERT INTO study_attempts VALUES('saved','prior');`)
  const sql=readFileSync(new URL('../migrations/0175_fe_exemption_20221211_strategy.sql',import.meta.url),'utf8');db.exec(sql);db.exec(sql)
  const rows=db.prepare('SELECT o.original_question,o.official_answer,q.answer_json,q.options_json,q.explanation FROM fe_exemption_occurrences o JOIN questions q ON q.id=o.canonical_question_id ORDER BY o.original_question').all()
  const keys=new Map([[61,'d'],[62,'a'],[63,'d'],[64,'a'],[65,'b'],[66,'c'],[67,'d'],[68,'c'],[69,'d'],[70,'d'],[72,'d'],[74,'c'],[75,'c'],[76,'b'],[78,'b'],[79,'b'],[80,'d']])
  assert.equal(rows.length,keys.size)
  for(const row of rows){assert.equal(row.official_answer,keys.get(row.original_question));assert.equal(JSON.parse(row.answer_json),row.official_answer);assert.deepEqual(JSON.parse(row.options_json).map(x=>x.id),['a','b','c','d']);assert.match(row.explanation,/中文/)}
  assert.equal(db.prepare("SELECT explanation FROM questions WHERE id='fe-ipa-official-2023-a-17'").get().explanation.split('中文解析').length,2)
  assert.equal(db.prepare('SELECT COUNT(*) n FROM study_attempts').get().n,1);assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(),[])
  const roi=[[135,100],[240,200],[360,300],[525,400]].map(([profit,cost])=>profit/cost)
  assert.equal(roi.indexOf(Math.max(...roi)),0);assert.equal((5*3+8*0+12)/(25*3)*100,36);assert.equal(1500-1000-200,300)
 }finally{db.close()}
})
