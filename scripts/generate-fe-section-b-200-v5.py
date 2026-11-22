"""Original FE B tracing exercises: 20 program structures, 10 input cases each."""
from pathlib import Path
import json,random,functools,operator
rng=random.Random(2026112205);rows=[];used=set();quote=lambda x:"'"+str(x).replace("'","''")+"'"
def add(topic,code,answer,jp,zh):
 n=len(rows)+1;assert isinstance(answer,int) and answer>=0
 prompt='【知学オリジナル・科目B】配列の添字は1から始まる。次の処理が終わったとき、表示される整数はどれか。\n'+code
 assert prompt not in used;used.add(prompt)
 vals=[answer]
 for v in (answer-1,answer+1,answer-2,answer+2,answer+3,answer+4):
  if v>=0 and v not in vals:vals.append(v)
  if len(vals)==4:break
 random.Random(975000+n).shuffle(vals)
 rows.append([f'fe-b-original-20261122-v5-{n:03d}','exam-fe',topic,'standard','single_choice',prompt,json.dumps([{'id':k,'text':str(v)} for k,v in zip('abcd',vals)],ensure_ascii=False,separators=(',',':')),json.dumps('abcd'[vals.index(answer)]),jp+' 答えは'+str(answer)+'。中文：'+zh+'，结果为'+str(answer)+'。','generated','知学オリジナル練習問題（IPA公式過去問ではありません）','ja','B','explicit','standard','general'])
def fmt(a):return '{'+', '.join(map(str,a))+'}'
def arr():return rng.sample(range(1,20),6)
for trial in range(10):
 v=arr();r=sum(v[i] for i in range(1,6,2));add('偶数添字の合計',f'A ← {fmt(v)}\ns ← 0\nfor i を 1 から 6 まで 1 ずつ増やす\n  if i mod 2 = 0 then s ← s + A[i]\n表示(s)',r,'2、4、6番目の要素を加える。','相加第2、4、6项')
 v=arr();r=sum((i+1)*x for i,x in enumerate(v));add('位置による重み',f'A ← {fmt(v)}\ns ← 0\nfor i を 1 から 6 まで 1 ずつ増やす\n  s ← s + i × A[i]\n表示(s)',r,'各要素に1始まりの添字を掛けて合計する。','每项乘以从1开始的下标后求和')
 v=rng.sample(range(1,21),9);matrix=f'{fmt(v[:3])}, {fmt(v[3:6])}, {fmt(v[6:])}';r=v[2]+v[4]+v[6];add('副対角線の集計',f'A ← {{{matrix}}} （3行3列）\ns ← 0\nfor i を 1 から 3 まで 1 ずつ増やす\n  s ← s + A[i,4−i]\n表示(s)',r,f'右上から左下の値{v[2]}、{v[4]}、{v[6]}を加える。',f'副对角线元素为{v[2]}、{v[4]}、{v[6]}')
 v=arr();matrix=f'{fmt(v[:3])}, {fmt(v[3:])}';row=[sum(v[:3]),sum(v[3:])];r=max(row);add('行合計の最大値',f'A ← {{{matrix}}} （2行3列）\nm ← 0\nfor i を 1 から 2 まで 1 ずつ増やす\n  s ← 0\n  for j を 1 から 3 まで 1 ずつ増やす\n    s ← s+A[i,j]\n  if s > m then m ← s\n表示(m)',r,f'各行の合計は{fmt(row)}。',f'两行合计分别为{fmt(row)}')
 v=arr();matrix=f'{fmt(v[:3])}, {fmt(v[3:])}';col=[v[i]+v[i+3] for i in range(3)];r=col.index(min(col))+1;add('列合計の最小位置',f'A ← {{{matrix}}} （2行3列）\nm ← A[1,1]+A[2,1]; p ← 1\nfor j を 2 から 3 まで 1 ずつ増やす\n  s ← A[1,j]+A[2,j]\n  if s < m then m ← s; p ← j\n表示(p)',r,f'列合計は{fmt(col)}で、同値は先の列を残す。',f'各列合计为{fmt(col)}，相等时保留较早列')
 v=arr();b=v[:];b.reverse();out=sum(b[:3]);add('反転後の先頭合計',f'A ← {fmt(v)}\nfor i を 1 から 3 まで 1 ずつ増やす\n  A[i]とA[7−i]を交換する\ns ← A[1]+A[2]+A[3]\n表示(s)',out,f'反転後は{fmt(b)}。',f'反转后为{fmt(b)}')
 v=arr();k=rng.randrange(2,5);s=sum(x for x in v if x%k==0);add('剰余で選ぶ合計',f'A ← {fmt(v)}\ns ← 0\nfor i を 1 から 6 まで 1 ずつ増やす\n  if A[i] mod {k} = 0 then s ← s+A[i]\n表示(s)',s,f'{k}で割り切れる要素を加える。',f'只累加能被{k}整除的元素')
 v=arr();k=rng.randrange(2,5);positions=[i+1 for i,x in enumerate(v) if x%k==0];r=positions[-1] if positions else 0;add('最後に一致する位置',f'A ← {fmt(v)}\np ← 0\nfor i を 1 から 6 まで 1 ずつ増やす\n  if A[i] mod {k} = 0 then p ← i\n表示(p)',r,f'条件を満たす位置は{fmt(positions)}、存在しない場合は0。',f'能被{k}整除的位置为{fmt(positions)}，不存在则返回0')
 v=[rng.randrange(0,2) for _ in range(8)];runs=[];c=0
 for x in v:
  c=c+1 if x==0 else 0;runs.append(c)
 r=max(runs);add('ゼロの連続長',f'A ← {fmt(v)}\nm ← 0; c ← 0\nfor i を 1 から 8 まで 1 ずつ増やす\n  if A[i] = 0 then c ← c+1\n  else c ← 0\n  if c > m then m ← c\n表示(m)',r,'0が連続した最大の長さを求める。','求连续0的最大长度')
 v=[rng.randrange(1,5) for _ in range(6)];r=sum(v[i]==v[i-1] for i in range(1,6));add('隣接する一致の個数',f'A ← {fmt(v)}\nc ← 0\nfor i を 2 から 6 まで 1 ずつ増やす\n  if A[i] = A[i−1] then c ← c+1\n表示(c)',r,'前の要素と同じ位置を数える。','统计与前一项相等的次数')
 v=arr();s=sorted(v);idx=rng.randrange(1,7);p=sum(1 for x in s if x<v[idx-1])+1;add('順位の算出',f'A ← {fmt(v)} （全要素は異なる）\np ← 1\nfor i を 1 から 6 まで 1 ずつ増やす\n  if A[i] < A[{idx}] then p ← p+1\n表示(p)',p,f'対象値{v[idx-1]}より小さい値の数に1を加える。',f'小于目标值{v[idx-1]}的数量加1得到升序名次')
 v=arr();z=v[:];swaps=0
 for i in range(4,-1,-1):
  if z[i]>z[i+1]:z[i],z[i+1]=z[i+1],z[i];swaps+=1
 add('右から左への交換回数',f'A ← {fmt(v)}\nc ← 0\nfor i を 5 から 1 まで 1 ずつ減らす\n  if A[i] > A[i+1] then A[i]とA[i+1]を交換し c ← c+1\n表示(c)',swaps,f'右から左へ1巡した配列は{fmt(z)}。',f'从右向左完成一轮后数组为{fmt(z)}')
 v=arr();x=v[0];z=v[1:];z.append(x);k=rng.randrange(1,7);r=sum(z[:k]);add('回転後の区間和',f'A ← {fmt(v)}\nt ← A[1]\nfor i を 1 から 5 まで 1 ずつ増やす\n  A[i] ← A[i+1]\nA[6] ← t\ns ← 0\nfor i を 1 から {k} まで 1 ずつ増やす\n  s ← s+A[i]\n表示(s)',r,f'回転後は{fmt(z)}。先頭{k}個を足す。',f'左旋后为{fmt(z)}，累加前{k}项')
 v=arr();k=rng.randrange(2,6);target=v[k-1];z=v[:];z.pop(k-1);out=sum(z[:3]);add('削除後の先頭合計',f'A ← {fmt(v)}\n{k}番目の要素を削除し、後の要素を前へ詰める\n表示(A[1]+A[2]+A[3])',out,f'{target}を削除すると{fmt(z)}となる。',f'删除第{k}项后数组为{fmt(z)}，累加前3项')
 v=arr();q=v[:4];q.pop(0);q.pop(0);q.extend(v[4:]);r=q[-1];add('キュー末尾の確認',f'空のキューQに{v[0]}、{v[1]}、{v[2]}、{v[3]}を順に入れる。2回取り出して捨てた後、{v[4]}、{v[5]}を順に入れる。末尾の値を削除せず表示する。',r,f'処理後のキューは先頭から{fmt(q)}。',f'处理后队列从头至尾为{fmt(q)}')
 v=arr();r=functools.reduce(operator.xor,v,0);add('XORの反復',f'A ← {fmt(v)}\ns ← 0\nfor i を 1 から 6 まで 1 ずつ増やす\n  s ← s XOR A[i]\n表示(s)\n注: XORは非負整数のビットごとの排他的論理和。',r,'順番にビットごとのXORを適用する。','逐项执行按位异或')
 v=arr();second=sorted(v)[-2];add('2番目の最大値',f'A ← {fmt(v)} （全要素は正かつ互いに異なる）\nhi ← 0; second ← 0\nfor i を 1 から 6 まで 1 ずつ増やす\n  if A[i] > hi then\n    second ← hi; hi ← A[i]\n  else if A[i] > second then second ← A[i]\n表示(second)',second,f'最大値{max(v)}に続く2番目の値を保持する。',f'维护最大值和第二大值，最大值为{max(v)}')
 v=arr();threshold=rng.randrange(6,15);pairs=sum(v[i]<threshold and v[i+1]>=threshold for i in range(5));add('しきい値の横断回数',f'A ← {fmt(v)}\nc ← 0\nfor i を 1 から 5 まで 1 ずつ増やす\n  if A[i] < {threshold} and A[i+1] ≧ {threshold} then c ← c+1\n表示(c)',pairs,f'{threshold}未満から以上へ変わる組を数える。',f'统计从小于{threshold}变为不小于{threshold}的相邻对')
 v=arr();threshold=rng.randrange(3,13);groups=[]
 for x in v:
  if x>threshold:groups.append(x)
 r=sum(groups[:3]);add('条件に合う先頭3件',f'A ← {fmt(v)}\ns ← 0; c ← 0\nfor i を 1 から 6 まで 1 ずつ増やす\n  if A[i] > {threshold} then s ← s+A[i]; c ← c+1\n  if c = 3 then 繰返しを終了する\n表示(s)',r,f'{threshold}を超える値を先頭から最大3件加える。',f'从前往后最多累加3个大于{threshold}的值')
 v=arr();r=sum(v[i]>v[5-i] for i in range(3));add('左右の大小比較',f'A ← {fmt(v)}\nc ← 0\nfor i を 1 から 3 まで 1 ずつ増やす\n  if A[i] > A[7−i] then c ← c+1\n表示(c)',r,'左右対称の3組で左側が大きい組を数える。','比较左右对应的3组，统计左边大于右边的组数')
assert len(rows)==200
cols='id,track_id,topic,difficulty,question_type,prompt,options_json,answer_json,explanation,source_type,source_reference,language,exam_section,exam_section_method,question_kind,exam_origin'
for part in (0,1):
 Path(f'migrations/{220+part:04d}_fe_section_b_trace_variants_{part+1}.sql').write_text('-- Original section B tracing variants; not official IPA questions.\nINSERT OR IGNORE INTO questions ('+cols+') VALUES\n'+',\n'.join('('+','.join(map(quote,row))+')' for row in rows[part*100:(part+1)*100])+';\n')
print('generated',len(rows),'section B exercises')
