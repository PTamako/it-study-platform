"""Generate original FE B practice: 160 algorithm variants and 40 security cases."""
from pathlib import Path
import json, random, math
rng=random.Random(2026112202);rows=[];used=set();q=lambda x:"'"+str(x).replace("'","''")+"'"
def add(topic,prompt,options,answer,jp,zh):
 n=len(rows)+1;assert len(options)==4 and len(set(options))==4 and answer in options
 prompt='【知学オリジナル・科目B】'+prompt;assert prompt not in used;used.add(prompt)
 opts=options[:];random.Random(804000+n).shuffle(opts)
 rows.append([f'fe-b-original-20261122-v2-{n:03d}','exam-fe',topic,'standard','single_choice',prompt,json.dumps([{'id':k,'text':str(x)} for k,x in zip('abcd',opts)],ensure_ascii=False,separators=(',',':')),json.dumps('abcd'[opts.index(answer)]),jp+' 中文：'+zh,'generated','知学オリジナル練習問題（IPA公式過去問ではありません）','ja','B','explicit','standard','general'])
def num(topic,code,answer,ex,zh):
 assert isinstance(answer,int) and answer>=0
 opts=[answer]
 for x in (answer-1,answer+1,answer-2,answer+2,answer+3,answer+4):
  if x>=0 and x not in opts:opts.append(x)
  if len(opts)==4:break
 add(topic,'配列の添字は1から始まる。次の処理が終わったときに表示される整数はどれか。\n'+code,opts,answer,ex+' 答えは'+str(answer)+'。',zh+'，结果为'+str(answer)+'。')
def a():return rng.sample(range(1,19),6)
def fmt(v):return '{'+', '.join(map(str,v))+'}'
for iteration in range(10):
 v=a();good=[x*x for x in v if x%2==0];r=sum(good)
 num('条件付き平方和',f'A ← {fmt(v)}\ns ← 0\nfor i を 1 から 6 まで 1 ずつ増やす\n  if A[i] mod 2 = 0 then s ← s + A[i] × A[i]\n表示(s)',r,f'偶数の平方は{fmt(good)}であり合計する。',f'筛选偶数并平方，平方值为{fmt(good)}')
 v=a();pos=[i+1 for i in range(1,5) if v[i]>v[i-1] and v[i]>v[i+1]]
 num('局所最大',f'A ← {fmt(v)}\nc ← 0\nfor i を 2 から 5 まで 1 ずつ増やす\n  if A[i] > A[i−1] and A[i] > A[i+1] then c ← c + 1\n表示(c)',len(pos),f'両隣より大きい位置は{fmt(pos)}。',f'同时大于左右邻居的位置为{fmt(pos)}')
 v=a();limit=rng.randrange(5,18);ix=[i+1 for i in range(5) if v[i]+v[i+1]>=limit]
 num('隣接値の条件',f'A ← {fmt(v)}\nc ← 0\nfor i を 1 から 5 まで 1 ずつ増やす\n  if A[i]+A[i+1] ≧ {limit} then c ← c + 1\n表示(c)',len(ix),f'条件を満たす左側添字は{fmt(ix)}。',f'相邻两数之和不少于{limit}的左侧位置为{fmt(ix)}')
 v=a();offset=rng.randrange(2,5);r=sum(v[offset-1:])
 num('区間和',f'A ← {fmt(v)}\ns ← 0\nfor i を {offset} から 6 まで 1 ずつ増やす\n  s ← s + A[i]\n表示(s)',r,f'添字{offset}から末尾までの合計。',f'累加第{offset}项到末尾')
 v=a();sums=[sum(v[i:i+3]) for i in range(4)];best=max(sums);pos=sums.index(best)+1
 num('移動区間最大',f'A ← {fmt(v)}\n最大 ← −1; 位置 ← 0\nfor i を 1 から 4 まで 1 ずつ増やす\n  s ← A[i]+A[i+1]+A[i+2]\n  if s > 最大 then 最大 ← s; 位置 ← i\n表示(位置)',pos,f'各3要素の合計は{fmt(sums)}。同値の場合は先の位置を保持する。',f'每个连续3项的和为{fmt(sums)}；相同值保留较早位置')
 v=a();r=v[0]+v[2]+v[4]-(v[1]+v[3]+v[5]);v=sorted(v,reverse=True) if r<0 else v;r=v[0]+v[2]+v[4]-v[1]-v[3]-v[5]
 num('交互加減',f'A ← {fmt(v)}\ns ← 0\nfor i を 1 から 6 まで 1 ずつ増やす\n  if i mod 2 = 1 then s ← s + A[i]\n  else s ← s − A[i]\n表示(s)',r,'奇数番目を加え、偶数番目を引く。','奇数位置相加，偶数位置相减')
 v=a();pos=rng.randrange(1,6);x=rng.choice([y for y in range(1,19) if y not in v]);z=v[:];z.insert(pos-1,x);read=rng.randrange(1,8)
 num('配列挿入',f'A ← {fmt(v)}\n値{x}を{pos}番目に挿入し、既存要素を後ろへずらす\n表示(A[{read}])',z[read-1],f'挿入後の配列は{fmt(z)}。',f'插入后的数组为{fmt(z)}')
 v=a();b=v[:];b.sort();target=b[rng.randrange(1,5)];insert=next(i for i,x in enumerate(b) if x>=target)+1
 num('整列済み位置探索',f'A ← {fmt(b)} （昇順）\np ← 1\nwhile p ≦ 6 and A[p] < {target}\n  p ← p + 1\n表示(p)',insert,f'{target}未満の要素を飛ばし最初の該当位置で止まる。',f'跳过小于{target}的元素，找到第一个不小于目标的位置')
 v=a();z=v[:]
 for j in range(5):
  if z[j]>z[j+1]:z[j],z[j+1]=z[j+1],z[j]
 read=rng.randrange(1,7)
 num('隣接交換',f'A ← {fmt(v)}\nfor i を 1 から 5 まで 1 ずつ増やす\n  if A[i] > A[i+1] then A[i]とA[i+1]を交換する\n表示(A[{read}])',z[read-1],f'左から1巡すると{fmt(z)}。',f'从左向右比较交换一轮得到{fmt(z)}')
 v=a();p=rng.randrange(3,7);m=max(v[:p]);idx=v.index(m)+1
 num('最大値の位置',f'A ← {fmt(v)}\n最大 ← A[1]; 位置 ← 1\nfor i を 2 から {p} まで 1 ずつ増やす\n  if A[i] > 最大 then 最大 ← A[i]; 位置 ← i\n表示(位置)',idx,f'先頭{p}個の最大値{m}の位置を保持する。',f'在前{p}项中寻找最大值{m}的位置')
 x=21+iteration*7;digits=list(map(int,str(x)));r=sum(digits)
 num('桁の合計',f'n ← {x}; s ← 0\nwhile n > 0\n  s ← s + (n mod 10)\n  n ← n ÷ 10 の小数点以下切捨て\n表示(s)',r,f'{x}の各桁を合計する。',f'逐位取余累加{x}的各位数字')
 x=7+iteration;y=rng.randrange(3,16);g=math.gcd(x,y)
 num('最大公約数',f'x ← {x}; y ← {y}\nwhile y ≠ 0\n  t ← x mod y\n  x ← y\n  y ← t\n表示(x)',g,'ユークリッドの互除法で余りが0になるまで更新する。',f'使用欧几里得算法求{x}与{y}的最大公约数')
 v=a();lim=rng.randrange(4,16);w=[x for x in v if x<lim];r=sum(w[:2])
 num('条件付き上限',f'A ← {fmt(v)}\ns ← 0; c ← 0\nfor i を 1 から 6 まで 1 ずつ増やす\n  if A[i] < {lim} then s ← s + A[i]; c ← c + 1\n  if c = 2 then 繰返しを終了する\n表示(s)',r,f'{lim}未満の先頭2件（なければ存在する件数）を合計する。',f'从左至右取前两个小于{lim}的元素求和；不足时累加存在的项')
 v=a();r=sum(v[i] for i in range(1,6) if v[i]>v[i-1])
 num('上昇分の合計',f'A ← {fmt(v)}\ns ← 0\nfor i を 2 から 6 まで 1 ずつ増やす\n  if A[i] > A[i−1] then s ← s + A[i]\n表示(s)',r,'直前より大きい要素の値を足す。','只累加比前一个元素大的当前值')
 v=a();r=sum(v[i-1]-v[i] for i in range(1,6) if v[i]<v[i-1])
 num('下降時の集計',f'A ← {fmt(v)}\ns ← 0\nfor i を 2 から 6 まで 1 ずつ増やす\n  if A[i] < A[i−1] then s ← s + A[i−1] − A[i]\n表示(s)',r,'減少した箇所の差を合計する。','只累加下降位置的前后差值')
 v=a();div=rng.randrange(2,6);b=[x%div for x in v];r=sum(b)
 num('剰余の集計',f'A ← {fmt(v)}\ns ← 0\nfor i を 1 から 6 まで 1 ずつ増やす\n  s ← s + (A[i] mod {div})\n表示(s)',r,f'各剰余は{fmt(b)}。',f'各元素除以{div}的余数为{fmt(b)}')
assert len(rows)==160
for line in Path('scripts/fe-section-b-security-cases.tsv').read_text().splitlines():
 topic,prompt,correct,b,c,d,ex=line.split('|');jp,zh=ex.split('中文：',1);add('情報セキュリティ・'+topic,prompt,[correct,b,c,d],correct,jp.strip(),zh.strip())
assert len(rows)==200 and len(used)==200
cols='id,track_id,topic,difficulty,question_type,prompt,options_json,answer_json,explanation,source_type,source_reference,language,exam_section,exam_section_method,question_kind,exam_origin'
for part in (0,1):
 chunk=rows[part*100:(part+1)*100];name=f'migrations/{214+part:04d}_fe_section_b_scenarios_{part+1}.sql'
 Path(name).write_text('-- Original section B drills and security scenarios; not IPA official questions.\nINSERT OR IGNORE INTO questions ('+cols+') VALUES\n'+',\n'.join('('+','.join(map(q,row))+')' for row in chunk)+';\n')
print('wrote',len(rows),'questions:',160,'algorithm variations and',40,'security cases')
