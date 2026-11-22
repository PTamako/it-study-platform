import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {DatabaseSync} from 'node:sqlite'

// Independently simulate each displayed algorithm against its actual inputs.
function expected(r) {
 const p=r.prompt, t=r.topic
 const initial=p.match(/A ← \{([^}]+)\}/)
 const a=initial ? initial[1].split(',').map(Number) : []
 const take=(re)=>{const m=p.match(re);assert.ok(m,`missing parameter: ${r.id}`);return Number(m[1])}
 switch(t){
  case '配列の条件集計': return p.includes('if A[i] ≧') ? a.filter(x=>x>=take(/A\[i\] ≧ (\d+)/)).reduce((x,y)=>x+y,0) : a.filter(x=>x<take(/A\[i\] < (\d+)/)).length
  case '隣接要素': return p.includes('abs(') ? a.slice(1).reduce((s,x,i)=>s+Math.abs(x-a[i]),0) : a.slice(1).filter((x,i)=>x>a[i]).length
  case '最大値と最小値':return Math.max(...a)-Math.min(...a)
  case '線形探索': {let v=p.includes('≧')?take(/A\[i\] ≧ (\d+)/):take(/A\[i\] = (\d+)/);return a.findIndex(x=>p.includes('≧')?x>=v:x===v)+1}
  case '二分探索': {const v=take(/A\[中\] = (\d+)/);let lo=0,hi=a.length-1,count=0;while(lo<=hi){const m=Math.floor((lo+hi)/2);count++;if(a[m]===v)break;if(a[m]<v)lo=m+1;else hi=m-1}return count}
  case '配列の交換': {let k=take(/t ← A\[(\d+)\]/)-1;[a[k],a[k+1]]=[a[k+1],a[k]];return a[k]}
  case '配列要素の削除': {let k=take(/\n(\d+)番目の要素を削除/)-1;a.splice(k,1);return a[k]}
  case '累積和': return a.slice(0,take(/1 から (\d+) まで/)).reduce((x,y)=>x+y,0)
  case '条件付き反復': {let k=take(/A\[i\] > (\d+)/),s=0;for(const v of a){if(v>k)break;s+=v}return s}
  case '配列の間隔走査': {let k=take(/まで (\d+) ずつ増やす/);return a.filter((_,i)=>i%k===0).reduce((x,y)=>x+y,0)}
  case '配列の反転': return a.reverse()[take(/表示\(A\[(\d+)\]\)/)-1]
  case 'チェックサム': return a.reduce((s,x)=>(s+x)%10,0)
  case '配列の回転': {a.push(a.shift());return a[take(/表示\(A\[(\d+)\]\)/)-1]}
  case 'スタック': {let m=p.match(/スタックSに(\d+)、(\d+)、(\d+)を順にpushする。1回popして捨て、(\d+)、(\d+)を順にpush/);assert.ok(m);let s=m.slice(1,4).map(Number);s.pop();s.push(Number(m[4]),Number(m[5]));return s.pop()}
  case 'キュー': {let m=p.match(/キューQに(\d+)、(\d+)、(\d+)を順に入れる。1回取り出して捨て、(\d+)、(\d+)を順に追加/);assert.ok(m);let q=m.slice(1,4).map(Number);q.shift();q.push(Number(m[4]),Number(m[5]));return q.shift()}
  case '配列の近傍更新': {let k=take(/\nA\[(\d+)\] ←/)-1;return a[k-1]+a[k+1]}
  case '選択と整列': return a.sort((x,y)=>x-y)[take(/表示\(A\[(\d+)\]\)/)-1]
  default: throw Error(`Unknown topic ${t}`)
 }
}

test('200 original section B drills produce the displayed answer and are idempotent',()=>{
 const db=new DatabaseSync(':memory:')
 try{
  db.exec(`PRAGMA foreign_keys=ON;
  CREATE TABLE questions(id TEXT PRIMARY KEY,track_id TEXT,topic TEXT,difficulty TEXT,question_type TEXT,prompt TEXT,options_json TEXT,answer_json TEXT,explanation TEXT,source_type TEXT,source_reference TEXT,language TEXT,exam_section TEXT,exam_section_method TEXT,question_kind TEXT,exam_origin TEXT);
  CREATE TABLE study_attempts(id TEXT PRIMARY KEY,question_id TEXT REFERENCES questions(id));
  INSERT INTO questions(id,track_id) VALUES('old','exam-fe');INSERT INTO study_attempts VALUES('keep','old');`)
  for(const n of ['0212_fe_section_b_algorithm_drills_1.sql','0213_fe_section_b_algorithm_drills_2.sql']){const sql=readFileSync(new URL('../migrations/'+n,import.meta.url),'utf8');db.exec(sql);db.exec(sql)}
  const rows=db.prepare("SELECT * FROM questions WHERE id LIKE 'fe-b-original-20261122-%' ORDER BY id").all()
  assert.equal(rows.length,200);assert.equal(new Set(rows.map(x=>x.prompt)).size,200)
  for(const r of rows){const opts=JSON.parse(r.options_json),key=JSON.parse(r.answer_json);assert.equal(r.track_id,'exam-fe');assert.equal(r.exam_section,'B');assert.equal(r.source_type,'generated');assert.match(r.source_reference,/IPA公式過去問ではありません/);assert.match(r.explanation,/中文：/);assert.deepEqual(opts.map(x=>x.id),['a','b','c','d']);assert.equal(new Set(opts.map(x=>x.text)).size,4);assert.equal(Number(opts.find(x=>x.id===key).text),expected(r),r.id)}
  assert.equal(db.prepare('SELECT count(*) n FROM study_attempts').get().n,1);assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(),[])
 }finally{db.close()}
})
