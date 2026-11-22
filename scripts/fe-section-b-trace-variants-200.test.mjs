import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {DatabaseSync} from 'node:sqlite'

function trace(r){
 const p=r.prompt,t=r.topic,one=p.match(/A ← \{([^{}]+)\}/),a=one?one[1].split(',').map(Number):[]
 const take=re=>{const m=p.match(re);assert.ok(m,`missing parameter ${r.id}`);return Number(m[1])}
 const matrix=()=>{const m=p.match(/A ← \{\{(.*?)\}\}/s);assert.ok(m,r.id);return m[1].split(/\},\s*\{/).map(x=>x.split(',').map(Number))}
 switch(t){
  case '偶数添字の合計':return a.filter((_,i)=>i%2===1).reduce((s,x)=>s+x,0)
  case '位置による重み':return a.reduce((s,x,i)=>s+x*(i+1),0)
  case '副対角線の集計':return matrix().reduce((s,row,i)=>s+row[2-i],0)
  case '行合計の最大値':return Math.max(...matrix().map(row=>row.reduce((s,x)=>s+x,0)))
  case '列合計の最小位置':{const m=matrix(),s=m[0].map((x,i)=>x+m[1][i]);return s.indexOf(Math.min(...s))+1}
  case '反転後の先頭合計':return a.reverse().slice(0,3).reduce((s,x)=>s+x,0)
  case '剰余で選ぶ合計':{const k=take(/A\[i\] mod (\d+) = 0/);return a.filter(x=>x%k===0).reduce((s,x)=>s+x,0)}
  case '最後に一致する位置':{const k=take(/A\[i\] mod (\d+) = 0/);let p=0;a.forEach((x,i)=>{if(x%k===0)p=i+1});return p}
  case 'ゼロの連続長':{let m=0,c=0;for(const v of a){c=v===0?c+1:0;m=Math.max(m,c)}return m}
  case '隣接する一致の個数':return a.slice(1).filter((x,i)=>x===a[i]).length
  case '順位の算出':{const idx=take(/A\[i\] < A\[(\d+)\]/)-1;return a.filter(x=>x<a[idx]).length+1}
  case '右から左への交換回数':{let c=0;for(let i=4;i>=0;i--)if(a[i]>a[i+1]){[a[i],a[i+1]]=[a[i+1],a[i]];c++}return c}
  case '回転後の区間和':{a.push(a.shift());return a.slice(0,take(/1 から (\d+) まで 1 ずつ増やす\n  s ←/)).reduce((s,x)=>s+x,0)}
  case '削除後の先頭合計':{a.splice(take(/\n(\d+)番目の要素を削除/)-1,1);return a.slice(0,3).reduce((s,x)=>s+x,0)}
  case 'キュー末尾の確認':{const m=p.match(/キューQに(\d+)、(\d+)、(\d+)、(\d+)を順に入れる。2回取り出して捨てた後、(\d+)、(\d+)を順に入れる/);assert.ok(m);const q=m.slice(1,5).map(Number);q.shift();q.shift();q.push(Number(m[5]),Number(m[6]));return q.at(-1)}
  case 'XORの反復':return a.reduce((s,x)=>s^x,0)
  case '2番目の最大値':return [...a].sort((x,y)=>y-x)[1]
  case 'しきい値の横断回数':{const k=take(/A\[i\] < (\d+)/);return a.slice(0,5).filter((x,i)=>x<k&&a[i+1]>=k).length}
  case '条件に合う先頭3件':{const k=take(/A\[i\] > (\d+)/);return a.filter(x=>x>k).slice(0,3).reduce((s,x)=>s+x,0)}
  case '左右の大小比較':return a.slice(0,3).filter((x,i)=>x>a[5-i]).length
  default:throw Error(`Unknown topic ${t}`)
 }
}

test('200 original FE B tracing questions preserve history and have correct outputs',()=>{
 const db=new DatabaseSync(':memory:')
 try{
  db.exec(`PRAGMA foreign_keys=ON; CREATE TABLE questions(id TEXT PRIMARY KEY,track_id TEXT,topic TEXT,difficulty TEXT,question_type TEXT,prompt TEXT,options_json TEXT,answer_json TEXT,explanation TEXT,source_type TEXT,source_reference TEXT,language TEXT,exam_section TEXT,exam_section_method TEXT,question_kind TEXT,exam_origin TEXT); CREATE TABLE study_attempts(id TEXT PRIMARY KEY,question_id TEXT REFERENCES questions(id)); INSERT INTO questions(id,track_id) VALUES('existing','exam-fe');INSERT INTO study_attempts VALUES('keep','existing');`)
  for(const n of ['0220_fe_section_b_trace_variants_1.sql','0221_fe_section_b_trace_variants_2.sql']){const sql=readFileSync(new URL('../migrations/'+n,import.meta.url),'utf8');db.exec(sql);db.exec(sql)}
  const rows=db.prepare("SELECT * FROM questions WHERE id LIKE 'fe-b-original-20261122-v5-%' ORDER BY id").all();assert.equal(rows.length,200);assert.equal(new Set(rows.map(x=>x.prompt)).size,200)
  for(const r of rows){const opts=JSON.parse(r.options_json),key=JSON.parse(r.answer_json);assert.equal(r.track_id,'exam-fe');assert.equal(r.exam_section,'B');assert.equal(r.source_type,'generated');assert.match(r.source_reference,/IPA公式過去問ではありません/);assert.match(r.explanation,/中文：/);assert.deepEqual(opts.map(x=>x.id),['a','b','c','d']);assert.equal(new Set(opts.map(x=>x.text)).size,4);const ans=opts.find(x=>x.id===key);assert.ok(ans);assert.equal(Number(ans.text),trace(r),r.id)}
  assert.equal(db.prepare('SELECT count(*) n FROM study_attempts').get().n,1);assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(),[])
 }finally{db.close()}
})
