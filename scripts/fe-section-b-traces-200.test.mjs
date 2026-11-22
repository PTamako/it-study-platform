import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {DatabaseSync} from 'node:sqlite'

// Independently simulate the displayed pseudocode and verify the stored answer.
function trace(r){
 const p=r.prompt,t=r.topic,one=p.match(/A ← \{([^{}]+)\}/),a=one?one[1].split(',').map(Number):[]
 const take=re=>{const m=p.match(re);assert.ok(m,`missing parameter ${r.id}`);return Number(m[1])}
 const matrix=()=>{const m=p.match(/A ← \{\{(.*?)\}\}/s);assert.ok(m,r.id);return m[1].split(/\},\s*\{/).map(x=>x.split(',').map(Number))}
 switch(t){
  case '行合計の判定':{const k=take(/if s ≧ (\d+)/);return matrix().filter(row=>row.reduce((s,x)=>s+x,0)>=k).length}
  case '列の条件判定':{const k=take(/A\[i,(\d+)\] mod/);return matrix().filter(row=>row[k-1]%2===0).length}
  case '行最小値の集計':return matrix().reduce((s,row)=>s+Math.min(...row),0)
  case '列の重み付け':{const k=take(/i×A\[i,(\d+)\]/);return matrix().reduce((s,row,i)=>s+(i+1)*row[k-1],0)}
  case '移動区間の最小位置':{const x=Array.from({length:4},(_,i)=>a[i]+a[i+1]+a[i+2]);return x.indexOf(Math.min(...x))+1}
  case '走査中の最大更新数':{let m=0,c=0;for(const x of a)if(x>m){m=x;c++}return c}
  case '昇順配列の最大差':return Math.max(...a.slice(1).map((x,i)=>x-a[i]))
  case '整列済み配列の値の種類':return new Set(a).size
  case '二分探索の個数':{const k=take(/A\[中\] < (\d+)/);return a.filter(x=>x<k).length}
  case '降順挿入位置':{const k=take(/A\[p\] > (\d+)/),i=a.findIndex(x=>x<k);return i<0?7:i+1}
  case '降順バブル2巡':{for(let pass=0;pass<2;pass++)for(let i=0;i<5;i++)if(a[i]<a[i+1])[a[i],a[i+1]]=[a[i+1],a[i]];return a[take(/表示\(A\[(\d+)\]\)/)-1]}
  case '選択ソート2回':return [...a].sort((x,y)=>x-y)[1]
  case '容量内の件数':{const k=take(/s\+A\[i\] > (\d+)/);let s=0,c=0;for(const x of a){if(s+x>k)break;s+=x;c++}return c}
  case '上昇幅の総和':return a.slice(1).reduce((s,x,i)=>s+Math.max(0,x-a[i]),0)
  case '売買の最大利益':{let best=0;for(let i=0;i<a.length;i++)for(let j=i+1;j<a.length;j++)best=Math.max(best,a[j]-a[i]);return best}
  case '左右対称の比較':return a.slice(0,4).filter((x,i)=>x!==a[7-i]).length
  default: throw Error(`unknown topic ${t}`)
 }
}

test('200 original FE B questions: independent traces and reviewed security keys',()=>{
 const db=new DatabaseSync(':memory:')
 try{
  db.exec(`PRAGMA foreign_keys=ON; CREATE TABLE questions(id TEXT PRIMARY KEY,track_id TEXT,topic TEXT,difficulty TEXT,question_type TEXT,prompt TEXT,options_json TEXT,answer_json TEXT,explanation TEXT,source_type TEXT,source_reference TEXT,language TEXT,exam_section TEXT,exam_section_method TEXT,question_kind TEXT,exam_origin TEXT); CREATE TABLE study_attempts(id TEXT PRIMARY KEY,question_id TEXT REFERENCES questions(id)); INSERT INTO questions(id,track_id) VALUES('existing','exam-fe');INSERT INTO study_attempts VALUES('keep','existing');`)
  for(const n of ['0218_fe_section_b_traces_1.sql','0219_fe_section_b_traces_2.sql']){let sql=readFileSync(new URL('../migrations/'+n,import.meta.url),'utf8');db.exec(sql);db.exec(sql)}
  const cases=readFileSync(new URL('./fe-section-b-security-cases-v4.tsv',import.meta.url),'utf8').trimEnd().split('\n').map(x=>x.split('|'))
  const rows=db.prepare("SELECT * FROM questions WHERE id LIKE 'fe-b-original-20261122-v4-%' ORDER BY id").all();assert.equal(rows.length,200);assert.equal(cases.length,40);assert.equal(new Set(rows.map(x=>x.prompt)).size,200)
  for(let i=0;i<rows.length;i++){const r=rows[i],opts=JSON.parse(r.options_json),key=JSON.parse(r.answer_json);assert.equal(r.track_id,'exam-fe');assert.equal(r.exam_section,'B');assert.equal(r.source_type,'generated');assert.match(r.source_reference,/IPA公式過去問ではありません/);assert.match(r.explanation,/中文：/);assert.deepEqual(opts.map(x=>x.id),['a','b','c','d']);assert.equal(new Set(opts.map(x=>x.text)).size,4);let ans=opts.find(x=>x.id===key);assert.ok(ans);if(i<160)assert.equal(Number(ans.text),trace(r),r.id);else{const c=cases[i-160];assert.equal(c.length,7);assert.equal(ans.text,c[2],r.id);assert.ok(r.prompt.endsWith(c[1]))}}
  assert.equal(db.prepare('SELECT count(*) n FROM study_attempts').get().n,1);assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(),[])
 }finally{db.close()}
})
