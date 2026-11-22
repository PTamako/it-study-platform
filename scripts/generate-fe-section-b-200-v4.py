"""Generate 160 original algorithm trace variants and 40 security scenarios."""
from pathlib import Path
import json,random
rng=random.Random(2026112204);rows=[];seen=set();quote=lambda x:"'"+str(x).replace("'","''")+"'"
def add(topic,prompt,choices,answer,jp,zh):
 n=len(rows)+1;assert len(choices)==4 and len(set(choices))==4 and answer in choices
 prompt='【知学オリジナル・科目B】'+prompt;assert prompt not in seen;seen.add(prompt);opts=choices[:];random.Random(954000+n).shuffle(opts)
 rows.append([f'fe-b-original-20261122-v4-{n:03d}','exam-fe',topic,'standard','single_choice',prompt,json.dumps([{'id':k,'text':str(v)} for k,v in zip('abcd',opts)],ensure_ascii=False,separators=(',',':')),json.dumps('abcd'[opts.index(answer)]),jp+' 中文：'+zh,'generated','知学オリジナル練習問題（IPA公式過去問ではありません）','ja','B','explicit','standard','general'])
def num(topic,code,ans,jp,zh):
 assert isinstance(ans,int) and ans>=0;choices=[ans]
 for v in [ans-1,ans+1,ans-2,ans+2,ans+3,ans+4]:
  if v>=0 and v not in choices:choices.append(v)
  if len(choices)==4:break
 add(topic,'配列の添字は1から始まる。次の処理が終わったとき、表示する整数はどれか。\n'+code,choices,ans,jp+' 答えは'+str(ans)+'。',zh+'，结果为'+str(ans)+'。')
def a():return rng.sample(range(1,21),6)
def fmt(v):return '{'+', '.join(map(str,v))+'}'
for trial in range(10):
 v=a();threshold=rng.randrange(8,20);matrix=f'{fmt(v[:3])}, {fmt(v[3:])}';r=sum(sum(v[i*3:i*3+3])>=threshold for i in range(2))
 num('行合計の判定',f'A ← {{{matrix}}} （2行3列）\nc ← 0\nfor i を 1 から 2 まで 1 ずつ増やす\n  s ← 0\n  for j を 1 から 3 まで 1 ずつ増やす\n    s ← s + A[i,j]\n  if s ≧ {threshold} then c ← c + 1\n表示(c)',r,f'各行の合計を計算し{threshold}以上の行を数える。',f'统计行和不小于{threshold}的行数')
 v=a();matrix=f'{fmt(v[:3])}, {fmt(v[3:])}';c=rng.randrange(1,4);r=sum(v[i*3+c-1]%2==0 for i in range(2))
 num('列の条件判定',f'A ← {{{matrix}}} （2行3列）\nc ← 0\nfor i を 1 から 2 まで 1 ずつ増やす\n  if A[i,{c}] mod 2 = 0 then c ← c + 1\n表示(c)',r,f'第{c}列にある偶数を数える。',f'统计第{c}列中的偶数')
 v=a();matrix=f'{fmt(v[:3])}, {fmt(v[3:])}';r=min(v[:3])+min(v[3:])
 num('行最小値の集計',f'A ← {{{matrix}}} （2行3列）\ns ← 0\nfor i を 1 から 2 まで 1 ずつ増やす\n  m ← A[i,1]\n  for j を 2 から 3 まで 1 ずつ増やす\n    if A[i,j] < m then m ← A[i,j]\n  s ← s + m\n表示(s)',r,f'各行の最小値{min(v[:3])}、{min(v[3:])}を加える。',f'每行最小值分别为{min(v[:3])}和{min(v[3:])}')
 v=a();matrix=f'{fmt(v[:3])}, {fmt(v[3:])}';c=rng.randrange(1,4);r=v[c-1]+2*v[c+2]
 num('列の重み付け',f'A ← {{{matrix}}} （2行3列）\ns ← 0\nfor i を 1 から 2 まで 1 ずつ増やす\n  s ← s + i×A[i,{c}]\n表示(s)',r,f'第{c}列の値に行番号を掛けて加える。',f'第{c}列每个值乘所在行号后求和')
 v=a();sums=[sum(v[i:i+3]) for i in range(4)];pos=sums.index(min(sums))+1
 num('移動区間の最小位置',f'A ← {fmt(v)}\n最小 ← A[1]+A[2]+A[3]; 位置 ← 1\nfor i を 2 から 4 まで 1 ずつ増やす\n  s ← A[i]+A[i+1]+A[i+2]\n  if s < 最小 then 最小 ← s; 位置 ← i\n表示(位置)',pos,f'3要素の各区間の合計は{fmt(sums)}。同値は先の位置を残す。',f'各连续3项的和为{fmt(sums)}，相同值保留较早位置')
 v=a();m=0;r=0
 for x in v:
  if x>m:m=x;r+=1
 num('走査中の最大更新数',f'A ← {fmt(v)}\nm ← 0; c ← 0\nfor i を 1 から 6 まで 1 ずつ増やす\n  if A[i] > m then m ← A[i]; c ← c+1\n表示(c)',r,'これまでの最大値を超えるたびに数える。','只在当前值超过此前最大值时计数')
 v=sorted(a());gaps=[v[i+1]-v[i] for i in range(5)];r=max(gaps)
 num('昇順配列の最大差',f'A ← {fmt(v)} （昇順）\nm ← 0\nfor i を 1 から 5 まで 1 ずつ増やす\n  d ← A[i+1] − A[i]\n  if d > m then m ← d\n表示(m)',r,f'隣接差は{fmt(gaps)}。',f'相邻差值依次为{fmt(gaps)}')
 v=sorted([rng.randrange(1,6) for _ in range(6)]);r=1+sum(v[i]!=v[i-1] for i in range(1,6))
 num('整列済み配列の値の種類',f'A ← {fmt(v)} （昇順）\nc ← 1\nfor i を 2 から 6 まで 1 ずつ増やす\n  if A[i] ≠ A[i−1] then c ← c + 1\n表示(c)',r,f'異なる値は{fmt(sorted(set(v)))}。',f'去重后的值为{fmt(sorted(set(v)))}')
 v=sorted(a());target=rng.choice([x for x in range(1,22) if x not in v]);r=sum(x<target for x in v)
 num('二分探索の個数',f'A ← {fmt(v)} （昇順）\n左 ← 1; 右 ← 7\nwhile 左 < 右\n  中 ← (左+右) ÷ 2 の小数点以下切捨て\n  if A[中] < {target} then 左 ← 中+1\n  else 右 ← 中\n表示(左−1)\n注: 右=7は末尾の次の位置。',r,f'{target}未満の値の個数に等しい。',f'结果等于小于{target}的元素个数')
 v=sorted(a(),reverse=True);target=rng.choice([x for x in range(1,22) if x not in v]);idx=next((i for i,x in enumerate(v) if x<target),6)+1
 num('降順挿入位置',f'A ← {fmt(v)} （降順）\np ← 1\nwhile p ≦ 6 and A[p] > {target}\n  p ← p+1\n表示(p)\n注: andは左側が偽なら右側を評価しない。',idx,f'{target}より大きい値を越えた最初の挿入位置。',f'跳过大于{target}的元素后得到降序插入位置')
 v=a();z=v[:]
 for _ in range(2):
  for i in range(5):
   if z[i]<z[i+1]:z[i],z[i+1]=z[i+1],z[i]
 pos=rng.randrange(1,7);r=z[pos-1]
 num('降順バブル2巡',f'A ← {fmt(v)}\n2回繰り返す:\n  for i を 1 から 5 まで 1 ずつ増やす\n    if A[i] < A[i+1] then A[i]とA[i+1]を交換する\n表示(A[{pos}])',r,f'2巡後の配列は{fmt(z)}。',f'两轮相邻交换后数组为{fmt(z)}')
 v=a();z=v[:]
 for i in range(2):
  p=min(range(i,6),key=lambda j:z[j]);z[i],z[p]=z[p],z[i]
 r=z[1]
 num('選択ソート2回',f'A ← {fmt(v)}\nfor i を 1 から 2 まで 1 ずつ増やす\n  p ← i\n  for j を i+1 から 6 まで 1 ずつ増やす\n    if A[j] < A[p] then p ← j\n  A[i]とA[p]を交換する\n表示(A[2])',r,f'2回の選択後は{fmt(z)}。',f'两轮选择排序后数组为{fmt(z)}')
 v=a();target=sum(v[:rng.randrange(2,6)]);sm=0;count=0
 for x in v:
  if sm+x>target:break
  sm+=x;count+=1
 num('容量内の件数',f'A ← {fmt(v)}\ns ← 0; c ← 0\nfor i を 1 から 6 まで 1 ずつ増やす\n  if s+A[i] > {target} then 繰返しを終了する\n  s ← s+A[i]; c ← c+1\n表示(c)',count,f'合計が{target}を超える直前まで個数を数える。',f'按顺序累加，下一项会使总和超过{target}时停止')
 v=a();diff=sum(max(0,v[i]-v[i-1]) for i in range(1,6))
 num('上昇幅の総和',f'A ← {fmt(v)}\ns ← 0\nfor i を 2 から 6 まで 1 ずつ増やす\n  if A[i] > A[i−1] then s ← s + A[i]−A[i−1]\n表示(s)',diff,'増加した箇所だけその増加幅を加える。','只累计比前一项上升的差额')
 v=a();gain=max([0]+[v[j]-v[i] for i in range(6) for j in range(i+1,6)])
 num('売買の最大利益',f'A ← {fmt(v)}\n利益 ← 0\nfor i を 1 から 5 まで 1 ずつ増やす\n  for j を i+1 から 6 まで 1 ずつ増やす\n    if A[j]−A[i] > 利益 then 利益 ← A[j]−A[i]\n表示(利益)',gain,'買う時点iより後のjで売る利益を比較する。','比较先买后卖的所有时点，取最大非负差值')
 v=[rng.randrange(1,5) for _ in range(8)];mismatch=sum(v[i]!=v[7-i] for i in range(4))
 num('左右対称の比較',f'A ← {fmt(v)}\nc ← 0\nfor i を 1 から 4 まで 1 ずつ増やす\n  if A[i] ≠ A[9−i] then c ← c+1\n表示(c)',mismatch,'左右対称の4組で異なる組を数える。','比较数组两端向内的四组值，统计不相等的组数')
assert len(rows)==160
for l in Path('scripts/fe-section-b-security-cases-v4.tsv').read_text().splitlines():
 topic,p,correct,b,c,d,ex=l.split('|');jp,zh=ex.split('中文：',1);add('情報セキュリティ・'+topic,p,[correct,b,c,d],correct,jp.strip(),zh.strip())
assert len(rows)==200
cols='id,track_id,topic,difficulty,question_type,prompt,options_json,answer_json,explanation,source_type,source_reference,language,exam_section,exam_section_method,question_kind,exam_origin'
for part in (0,1):
 Path(f'migrations/{218+part:04d}_fe_section_b_traces_{part+1}.sql').write_text('-- Original section B trace variations and security cases; not official IPA questions.\nINSERT OR IGNORE INTO questions ('+cols+') VALUES\n'+',\n'.join('('+','.join(map(quote,row))+')' for row in rows[part*100:(part+1)*100])+';\n')
print('generated',len(rows),'section B questions')
