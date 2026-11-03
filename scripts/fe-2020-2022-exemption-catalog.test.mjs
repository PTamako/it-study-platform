import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {DatabaseSync} from 'node:sqlite'

const catalog=readFileSync(new URL('../migrations/0124_fe_2020_2022_official_exemption_catalog.sql',import.meta.url),'utf8')
const expected={
  2020:['20200614','20200726','20201213','20210124'],
  2021:['20210613','20210725','20211212','20220123'],
  2022:['20220612','20220724','20221211','20230122'],
}
const root='https://www.ipa.go.jp/shiken/about/ug65p90000001bq0-att/'
test('12 separately published IPA original source URLs from fiscal years 2020 to 2022 are recorded without representing CBT originals',()=>{
 const db=new DatabaseSync(':memory:')
 try{
  db.exec('CREATE TABLE question_sources (id TEXT PRIMARY KEY,exam_code TEXT,year_label TEXT,subject_label TEXT,title TEXT,source_url TEXT,content_mode TEXT,license_note TEXT,checked_at TEXT,notes TEXT);'+
    'CREATE TABLE questions (id TEXT PRIMARY KEY,track_id TEXT);')
  db.exec("INSERT INTO questions VALUES('keep-me','exam-fe')")
  db.exec(catalog)
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM question_sources').get().n,12)
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM questions').get().n,1)
  for(const [fy,dates] of Object.entries(expected)){
    const rows=db.prepare('SELECT * FROM question_sources WHERE year_label=? ORDER BY id').all(fy)
    assert.equal(rows.length,4)
    assert.deepEqual(rows.map(x=>x.id),dates.map(d=>'fe-ipa-exemption-'+d))
    for(const [i,row] of rows.entries()){
      const date=dates[i]
      assert.equal(row.exam_code,'FE')
      assert.match(row.subject_label,/修了試験/)
      assert.equal(row.source_url,root+'tokurei_Mondai_'+date+'_FE.pdf')
      assert.match(row.notes,new RegExp('tokurei_ans_'+date+'_FE\\.pdf'))
      assert.equal(row.content_mode,'link_only','do not imply the 80 unreviewed questions are in the answerable D1 bank')
      assert.match(row.notes,/重複/)
      assert.match(row.license_note,/一般FEのCBT本試験問題とは異なる/)
      assert.match(row.title,/80問/)
    }
  }
  db.exec(catalog)
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM question_sources').get().n,12)
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM questions').get().n,1)
 }finally{db.close()}
})
test('no invented 2020/2021/2022 CBT question IDs or destructive data updates',()=>{
 assert.match(catalog,/令和|2020/)
 assert.match(catalog,/CBT本試験問題とは異なる/)
 assert.doesNotMatch(catalog,/INSERT INTO questions|UPDATE questions|DROP TABLE|DELETE FROM/i)
 assert.equal((catalog.match(/INSERT OR IGNORE INTO question_sources/g)||[]).length,12)
})
