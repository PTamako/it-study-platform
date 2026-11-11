import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'

const file = name => readFileSync(new URL(`../migrations/${name}`,import.meta.url),'utf8')
test('technology adaptations and source-verified repeated positions import without altering learning history',()=>{
  const db=new DatabaseSync(':memory:')
  try {
    db.exec(`PRAGMA foreign_keys=ON;
      CREATE TABLE questions(id TEXT PRIMARY KEY,track_id TEXT NOT NULL,topic TEXT,difficulty TEXT,
       question_type TEXT,prompt TEXT,options_json TEXT,answer_json TEXT,explanation TEXT,
       source_type TEXT NOT NULL,source_reference TEXT,language TEXT,exam_section TEXT,
       exam_section_method TEXT,question_kind TEXT NOT NULL DEFAULT 'standard');
      CREATE TABLE study_attempts(id TEXT PRIMARY KEY,question_id TEXT);
      CREATE TABLE question_review_state(question_id TEXT PRIMARY KEY,mastered INTEGER);
      INSERT INTO questions(id,track_id,topic,prompt,source_type) VALUES ('existing','exam-fe','keep','unchanged','personal');
      INSERT INTO study_attempts VALUES ('attempt','existing');
      INSERT INTO question_review_state VALUES ('existing',1);`)
    db.exec(file('0125_fe_exemption_provenance.sql'));db.exec(file('0128_indexed_mock_draw_pool.sql'))
    const insert=db.prepare(`INSERT INTO questions(id,track_id,topic,prompt,options_json,answer_json,explanation,source_type,question_kind,exam_origin) VALUES (?,'exam-fe','sample','retained','[]',?,'sample proof','licensed','official_sample','general')`)
    for(const [n,a] of [[20,'d'],[22,'b'],[27,'b']]) insert.run(`fe-ipa-sample-2022-a-${String(n).padStart(3,'0')}`,JSON.stringify(a))
    const migration=file('0159_fe_exemption_20201213_technology.sql');db.exec(migration);db.exec(migration)
    const rows=db.prepare(`SELECT o.sitting_date,o.original_question,o.official_answer,o.canonical_question_id,
      q.answer_json,q.options_json,q.explanation FROM fe_exemption_occurrences o
      JOIN questions q ON q.id=o.canonical_question_id ORDER BY o.sitting_date,o.original_question`).all()
    assert.equal(rows.length,23)
    const expected={17:'c',21:'c',23:'c',25:'d',26:'b',27:'d',28:'d',30:'a',31:'a',32:'b',33:'b',34:'c',35:'b',36:'c',37:'c',38:'a',39:'b'}
    for(const row of rows){
      assert.equal(JSON.parse(row.answer_json),row.official_answer)
      if(row.sitting_date==='2020-12-13') assert.equal(row.official_answer,expected[row.original_question])
      if(row.canonical_question_id.startsWith('fe-exempt-')) {
        assert.equal(JSON.parse(row.options_json).length,4)
        assert.match(row.explanation,/中文/)
      }
    }
    for(const [date,num,canonical] of [['2022-07-24',23,'fe-ipa-sample-2022-a-020'],['2022-07-24',25,'fe-exempt-2020-20201213-q25'],['2022-07-24',30,'fe-exempt-2020-20201213-q31'],['2022-07-24',32,'fe-exempt-2020-20201213-q32'],['2022-06-12',37,'fe-exempt-2020-20201213-q37'],['2022-06-12',39,'fe-exempt-2020-20201213-q38']]) {
      assert.equal(rows.find(r=>r.sitting_date===date && r.original_question===num)?.canonical_question_id,canonical)
    }
    assert.equal(db.prepare("SELECT COUNT(*) AS n FROM mock_question_pool WHERE exam_origin='fe_exemption'").get().n,15)
    assert.equal(db.prepare("SELECT prompt FROM questions WHERE id='existing'").get().prompt,'unchanged')
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM study_attempts').get().n,1)
    assert.equal(db.prepare("SELECT mastered FROM question_review_state WHERE question_id='existing'").get().mastered,1)
    assert.equal(db.prepare('PRAGMA foreign_key_check').all().length,0)
    assert.doesNotMatch(migration,/\b(?:DELETE|UPDATE|REPLACE|DROP)\b/i)
  }finally{db.close()}
})

test('spooling timeline, audio prebuffer and correlated SQL match their official answers',()=>{
  const cpu=[50,30,20,40],printing=[50,40,30,20]
  let cpuEnd=0,printerEnd=0
  for(let i=0;i<4;i++){cpuEnd+=cpu[i];printerEnd=Math.max(cpuEnd,printerEnd)+printing[i]}
  assert.equal(printerEnd,190)
  assert.equal((2.4*8000/192)*(192-128)/128,50)
  const db=new DatabaseSync(':memory:')
  try {
    db.exec(`CREATE TABLE 商品 (商品番号 TEXT PRIMARY KEY, 商品名 TEXT, 単価 INTEGER);
      CREATE TABLE 在庫(倉庫番号 TEXT, 商品番号 TEXT NOT NULL, 在庫数 INTEGER, PRIMARY KEY(倉庫番号,商品番号));
      INSERT INTO 商品 VALUES ('A','a',1),('B','b',2),('C','c',3);
      INSERT INTO 在庫 VALUES ('X','A',1),('Y','A',2),('X','C',0);`)
    const original=db.prepare('SELECT 商品番号 FROM 商品 WHERE 商品番号 NOT IN (SELECT 商品番号 FROM 在庫)').all()
    const chosen=db.prepare('SELECT 商品番号 FROM 商品 WHERE NOT EXISTS (SELECT 商品番号 FROM 在庫 WHERE 商品.商品番号 = 在庫.商品番号)').all()
    assert.deepEqual(chosen,original)
    assert.equal(chosen[0].商品番号,'B')
  }finally{db.close()}
})
