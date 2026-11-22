import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {DatabaseSync} from 'node:sqlite'

// Evaluate the problem statements rather than reuse the generator's calculations.
function trace(r){
 const p=r.prompt,t=r.topic,one=p.match(/A ← \{([^{}]+)\}/),a=one?one[1].split(',').map(Number):[]
 const take=re=>{const m=p.match(re);assert.ok(m,`missing parameter ${r.id}`);return Number(m[1])}
 const matrix=()=>{const m=p.match(/A ← \{\{(.*?)\}\}/s);assert.ok(m,r.id);return m[1].split(/\},\s*\{/).map(x=>x.split(',').map(Number))}
 switch(t){
  case '行列の行集計':{const m=matrix(),i=take(/A\[(\d+), j\]/);return m[i-1].reduce((s,x)=>s+x,0)}
  case '行列の列集計':{const m=matrix(),j=take(/A\[i, (\d+)\]/);return m.reduce((s,row)=>s+row[j-1],0)}
  case '行列の対角線':{const m=matrix();return m.reduce((s,row,i)=>s+row[i],0)}
  case '行列の転置':{const m=matrix(),x=p.match(/表示\(B\[(\d+),(\d+)\]\)/);assert.ok(x);return m[Number(x[2])-1][Number(x[1])-1]}
  case '累積和の区間':{const m=p.match(/表示\(P\[(\d+)\] − P\[(\d+)\]\)/);assert.ok(m);return a.slice(Number(m[2]),Number(m[1])).reduce((s,x)=>s+x,0)}
  case '累積条件で終了':{const k=take(/if s ≧ (\d+)/);let s=0;for(let i=0;i<a.length;i++){s+=a[i];if(s>=k)return i+1}return 0}
  case '転倒数':{let c=0;for(let i=0;i<a.length;i++)for(let j=i+1;j<a.length;j++)if(a[i]>a[j])c++;return c}
  case 'バブル1巡の交換回数':{let c=0;for(let i=0;i<5;i++)if(a[i]>a[i+1]){[a[i],a[i+1]]=[a[i+1],a[i]];c++}return c}
  case '選択ソート位置':return a.indexOf(Math.min(...a))+1
  case '挿入時の移動回数':return a.slice(0,4).filter(v=>v>a[4]).length
  case '頻度表':{const n=take(/表示\(C\[(\d+)\]\)/);return a.filter(v=>v===n).length}
  case '異なる値の数':return new Set(a).size
  case '二分探索の挿入位置':{const k=take(/A\[中\] < (\d+)/),idx=a.findIndex(v=>v>=k);return idx<0?7:idx+1}
  case '和が一致する組':{const n=take(/A\[i\]\+A\[j\] = (\d+)/);let c=0;for(let i=0;i<5;i++)for(let j=i+1;j<6;j++)if(a[i]+a[j]===n)c++;return c}
  case '2配列の条件集計':{const b=p.match(/B ← \{([^{}]+)\}/)[1].split(',').map(Number),k=take(/A\[i\]\+B\[i\] ≧ (\d+)/);return a.reduce((s,v,i)=>s+(v+b[i]>=k?v*b[i]:0),0)}
  case '連続長':{let m=0,c=0;for(let v of a){c=v===1?c+1:0;m=Math.max(m,c)}return m}
  default: throw Error(`unknown topic ${t}`)
 }
}

test('200 original FE B questions: algorithm traces and reviewed security keys',()=>{
 const db=new DatabaseSync(':memory:')
 try{
  db.exec(`PRAGMA foreign_keys=ON; CREATE TABLE questions(id TEXT PRIMARY KEY,track_id TEXT,topic TEXT,difficulty TEXT,question_type TEXT,prompt TEXT,options_json TEXT,answer_json TEXT,explanation TEXT,source_type TEXT,source_reference TEXT,language TEXT,exam_section TEXT,exam_section_method TEXT,question_kind TEXT,exam_origin TEXT); CREATE TABLE study_attempts(id TEXT PRIMARY KEY,question_id TEXT REFERENCES questions(id)); INSERT INTO questions(id,track_id) VALUES('existing','exam-fe');INSERT INTO study_attempts VALUES('keep','existing');`)
  for(const n of ['0216_fe_section_b_applied_1.sql','0217_fe_section_b_applied_2.sql']){let sql=readFileSync(new URL('../migrations/'+n,import.meta.url),'utf8');db.exec(sql);db.exec(sql)}
  const cases=readFileSync(new URL('./fe-section-b-security-cases-v3.tsv',import.meta.url),'utf8').trimEnd().split('\n').map(x=>x.split('|'))
  const rows=db.prepare("SELECT * FROM questions WHERE id LIKE 'fe-b-original-20261122-v3-%' ORDER BY id").all();assert.equal(rows.length,200);assert.equal(cases.length,40);assert.equal(new Set(rows.map(x=>x.prompt)).size,200)
  for(let i=0;i<rows.length;i++){const r=rows[i],opts=JSON.parse(r.options_json),key=JSON.parse(r.answer_json);assert.equal(r.track_id,'exam-fe');assert.equal(r.exam_section,'B');assert.equal(r.source_type,'generated');assert.match(r.source_reference,/IPA公式過去問ではありません/);assert.match(r.explanation,/中文：/);assert.deepEqual(opts.map(x=>x.id),['a','b','c','d']);assert.equal(new Set(opts.map(x=>x.text)).size,4);let ans=opts.find(x=>x.id===key);assert.ok(ans);if(i<160)assert.equal(Number(ans.text),trace(r),r.id);else{const c=cases[i-160];assert.equal(c.length,7);assert.equal(ans.text,c[2],r.id);assert.ok(r.prompt.endsWith(c[1]))}}
  assert.equal(db.prepare('SELECT count(*) n FROM study_attempts').get().n,1);assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(),[])
 }finally{db.close()}
})
