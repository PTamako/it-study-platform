import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {DatabaseSync} from 'node:sqlite'

// Evaluate the displayed procedures independently of the content generator.
function trace(r) {
 const p=r.prompt,t=r.topic,m=p.match(/A ← \{([^}]+)\}/),a=m?m[1].split(',').map(Number):[]
 const get=re=>{const x=p.match(re);assert.ok(x,`missing parameter ${r.id}`);return Number(x[1])}
 switch(t){
  case '条件付き平方和':return a.filter(x=>x%2===0).reduce((s,x)=>s+x*x,0)
  case '局所最大':return a.slice(1,5).filter((v,i)=>v>a[i]&&v>a[i+2]).length
  case '隣接値の条件':{let k=get(/A\[i\]\+A\[i\+1\] ≧ (\d+)/);return a.slice(0,5).filter((v,i)=>v+a[i+1]>=k).length}
  case '区間和':return a.slice(get(/i を (\d+) から 6 まで/)-1).reduce((s,x)=>s+x,0)
  case '移動区間最大':{let sums=Array.from({length:4},(_,i)=>a[i]+a[i+1]+a[i+2]);return sums.indexOf(Math.max(...sums))+1}
  case '交互加減':return a.reduce((s,x,i)=>s+(i%2===0?x:-x),0)
  case '配列挿入':{let z=p.match(/値(\d+)を(\d+)番目に挿入/);assert.ok(z);a.splice(Number(z[2])-1,0,Number(z[1]));return a[get(/表示\(A\[(\d+)\]\)/)-1]}
  case '整列済み位置探索':{let v=get(/A\[p\] < (\d+)/);return a.findIndex(x=>x>=v)+1}
  case '隣接交換':{for(let i=0;i<5;i++)if(a[i]>a[i+1])[a[i],a[i+1]]=[a[i+1],a[i]];return a[get(/表示\(A\[(\d+)\]\)/)-1]}
  case '最大値の位置':{let n=get(/2 から (\d+) まで/),part=a.slice(0,n);return part.indexOf(Math.max(...part))+1}
  case '桁の合計':{let n=get(/n ← (\d+)/);return String(n).split('').reduce((s,x)=>s+Number(x),0)}
  case '最大公約数':{let x=get(/x ← (\d+)/),y=get(/y ← (\d+)/);let best=1;for(let i=1;i<=Math.min(x,y);i++)if(x%i===0&&y%i===0)best=i;return best}
  case '条件付き上限':{let k=get(/A\[i\] < (\d+)/);return a.filter(v=>v<k).slice(0,2).reduce((s,x)=>s+x,0)}
  case '上昇分の合計':return a.slice(1).reduce((s,v,i)=>s+(v>a[i]?v:0),0)
  case '下降時の集計':return a.slice(1).reduce((s,v,i)=>s+(v<a[i]?a[i]-v:0),0)
  case '剰余の集計':{let k=get(/A\[i\] mod (\d+)/);return a.reduce((s,x)=>s+x%k,0)}
  default: throw Error(`Unknown algorithm: ${t}`)
 }
}

test('200 original FE B questions: trace outputs, security keys, and safe repeated migration',()=>{
 const db=new DatabaseSync(':memory:')
 try{
  db.exec(`PRAGMA foreign_keys=ON; CREATE TABLE questions(id TEXT PRIMARY KEY,track_id TEXT,topic TEXT,difficulty TEXT,question_type TEXT,prompt TEXT,options_json TEXT,answer_json TEXT,explanation TEXT,source_type TEXT,source_reference TEXT,language TEXT,exam_section TEXT,exam_section_method TEXT,question_kind TEXT,exam_origin TEXT); CREATE TABLE study_attempts(id TEXT PRIMARY KEY,question_id TEXT REFERENCES questions(id)); INSERT INTO questions(id,track_id) VALUES('existing','exam-fe'); INSERT INTO study_attempts VALUES('keep','existing');`)
  for(const n of ['0214_fe_section_b_scenarios_1.sql','0215_fe_section_b_scenarios_2.sql']){let sql=readFileSync(new URL('../migrations/'+n,import.meta.url),'utf8');db.exec(sql);db.exec(sql)}
  const cases=readFileSync(new URL('./fe-section-b-security-cases.tsv',import.meta.url),'utf8').trimEnd().split('\n').map(l=>l.split('|'))
  const rows=db.prepare("SELECT * FROM questions WHERE id LIKE 'fe-b-original-20261122-v2-%' ORDER BY id").all();assert.equal(rows.length,200);assert.equal(cases.length,40);assert.equal(new Set(rows.map(x=>x.prompt)).size,200)
  for(let i=0;i<rows.length;i++){const r=rows[i],opts=JSON.parse(r.options_json),key=JSON.parse(r.answer_json);assert.equal(r.track_id,'exam-fe');assert.equal(r.exam_section,'B');assert.equal(r.source_type,'generated');assert.match(r.source_reference,/IPA公式過去問ではありません/);assert.match(r.explanation,/中文：/);assert.deepEqual(opts.map(x=>x.id),['a','b','c','d']);assert.equal(new Set(opts.map(x=>x.text)).size,4);let ans=opts.find(x=>x.id===key);assert.ok(ans);if(i<160)assert.equal(Number(ans.text),trace(r),r.id);else {const c=cases[i-160];assert.equal(c.length,7);assert.equal(ans.text,c[2],r.id);assert.ok(r.prompt.endsWith(c[1]))}}
  assert.equal(db.prepare('SELECT count(*) n FROM study_attempts').get().n,1);assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(),[])
 }finally{db.close()}
})
