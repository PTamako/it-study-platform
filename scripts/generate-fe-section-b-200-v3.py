"""Create 160 original algorithm drills and 40 independently authored security cases."""
from pathlib import Path
import json,random
rng=random.Random(2026112203);rows=[];seen=set();quote=lambda s:"'"+str(s).replace("'","''")+"'"
def add(topic,prompt,choices,answer,jp,zh):
 n=len(rows)+1;assert len(choices)==4 and len(set(choices))==4 and answer in choices
 prompt='【知学オリジナル・科目B】'+prompt;assert prompt not in seen;seen.add(prompt)
 options=choices[:];random.Random(905000+n).shuffle(options)
 rows.append([f'fe-b-original-20261122-v3-{n:03d}','exam-fe',topic,'standard','single_choice',prompt,json.dumps([{'id':k,'text':str(v)} for k,v in zip('abcd',options)],ensure_ascii=False,separators=(',',':')),json.dumps('abcd'[options.index(answer)]),jp+' 中文：'+zh,'generated','知学オリジナル練習問題（IPA公式過去問ではありません）','ja','B','explicit','standard','general'])
def num(topic,code,ans,jp,zh):
 assert isinstance(ans,int) and ans>=0
 opts=[ans]
 for x in [ans-1,ans+1,ans-2,ans+2,ans+3,ans+4]:
  if x>=0 and x not in opts:opts.append(x)
  if len(opts)==4:break
 add(topic,'配列の添字は1から始まる。処理後に表示する整数はどれか。\n'+code,opts,ans,jp+' 答えは'+str(ans)+'。',zh+'，结果为'+str(ans)+'。')
def show(a):return '{'+', '.join(map(str,a))+'}'
def arr():return rng.sample(range(1,18),6)
for trial in range(10):
 v=arr();r=rng.randrange(1,3);o=sum(v[(r-1)*3:r*3]);matrix=f'{show(v[:3])}, {show(v[3:])}'
 num('行列の行集計',f'A ← {{{matrix}}} （2行3列）\ns ← 0\nfor j を 1 から 3 まで 1 ずつ増やす\n  s ← s + A[{r}, j]\n表示(s)',o,f'第{r}行の3要素を合計する。',f'累加第{r}行3个元素')
 v=arr();c=rng.randrange(1,4);o=v[c-1]+v[c+2];matrix=f'{show(v[:3])}, {show(v[3:])}'
 num('行列の列集計',f'A ← {{{matrix}}} （2行3列）\ns ← 0\nfor i を 1 から 2 まで 1 ずつ増やす\n  s ← s + A[i, {c}]\n表示(s)',o,f'第{c}列の2要素を合計する。',f'累加第{c}列2个元素')
 v=rng.sample(range(1,20),9);matrix=f'{show(v[:3])}, {show(v[3:6])}, {show(v[6:])}';o=v[0]+v[4]+v[8]
 num('行列の対角線',f'A ← {{{matrix}}} （3行3列）\ns ← 0\nfor i を 1 から 3 まで 1 ずつ増やす\n  s ← s + A[i, i]\n表示(s)',o,f'主対角の値{v[0]}、{v[4]}、{v[8]}を足す。',f'主对角元素为{v[0]}、{v[4]}、{v[8]}')
 v=arr();matrix=f'{show(v[:3])}, {show(v[3:])}';i=rng.randrange(1,4);j=rng.randrange(1,3);o=v[(j-1)*3+i-1]
 num('行列の転置',f'A ← {{{matrix}}} （2行3列）\n3行2列のBについて B[i,j] ← A[j,i] とする\n表示(B[{i},{j}])',o,f'B[{i},{j}]はA[{j},{i}]と等しい。',f'转置后B[{i},{j}]等于A[{j},{i}]')
 v=arr();lo=rng.randrange(1,4);hi=rng.randrange(lo+1,7);pref=[0]
 for x in v:pref.append(pref[-1]+x)
 o=pref[hi]-pref[lo-1]
 num('累積和の区間',f'A ← {show(v)}\nP[0] ← 0\nfor i を 1 から 6 まで 1 ずつ増やす\n  P[i] ← P[i−1] + A[i]\n表示(P[{hi}] − P[{lo-1}])',o,f'差は添字{lo}〜{hi}の合計に等しい。',f'前缀和相减得到第{lo}至{hi}项之和')
 v=arr();k=rng.randrange(2,6);s=0;pos=0
 for idx,x in enumerate(v,1):
  s+=x
  if s>=sum(v[:k]):pos=idx;break
 target=sum(v[:k])
 num('累積条件で終了',f'A ← {show(v)}\ns ← 0; p ← 0\nfor i を 1 から 6 まで 1 ずつ増やす\n  s ← s + A[i]\n  if s ≧ {target} then p ← i; 繰返しを終了する\n表示(p)',pos,f'合計が初めて{target}以上となる位置で終了。',f'累计和首次达到{target}时停止并返回位置')
 v=arr();pairs=sum(v[i]>v[j] for i in range(6) for j in range(i+1,6))
 num('転倒数',f'A ← {show(v)}\nc ← 0\nfor i を 1 から 5 まで 1 ずつ増やす\n  for j を i+1 から 6 まで 1 ずつ増やす\n    if A[i] > A[j] then c ← c + 1\n表示(c)',pairs,'i<jで左の値が大きい組合せを数える。','枚举i小于j且前者数值较大的组合')
 v=arr();z=v[:];swaps=0
 for k in range(5):
  if z[k]>z[k+1]:z[k],z[k+1]=z[k+1],z[k];swaps+=1
 num('バブル1巡の交換回数',f'A ← {show(v)}\nc ← 0\nfor i を 1 から 5 まで 1 ずつ増やす\n  if A[i] > A[i+1] then A[i]とA[i+1]を交換し c ← c + 1\n表示(c)',swaps,f'1巡後は{show(z)}となる。',f'从左向右一轮后数组为{show(z)}')
 v=arr();pos=v.index(min(v))+1
 num('選択ソート位置',f'A ← {show(v)}\np ← 1\nfor i を 2 から 6 まで 1 ずつ増やす\n  if A[i] < A[p] then p ← i\n表示(p)',pos,f'最小値{min(v)}の位置を求める。',f'最小值{min(v)}的位置')
 v=arr();prefix=sorted(v[:4]);x=v[4];shift=sum(y>x for y in prefix)
 num('挿入時の移動回数',f'A ← {show(prefix+[x])} （先頭4要素は昇順）\nx ← A[5]; j ← 4; c ← 0\nwhile j ≧ 1 and A[j] > x\n  A[j+1] ← A[j]; j ← j−1; c ← c+1\nA[j+1] ← x\n表示(c)',shift,f'先頭4要素のうち{x}より大きい要素が後ろへ移動する。',f'前4项中大于{x}的元素均要右移')
 v=[rng.randrange(1,5) for _ in range(6)];target=rng.randrange(1,5);count=v.count(target)
 num('頻度表',f'A ← {show(v)}\nC ← {{0, 0, 0, 0}}\nfor i を 1 から 6 まで 1 ずつ増やす\n  C[A[i]] ← C[A[i]] + 1\n表示(C[{target}])',count,f'値{target}が出現する回数を数える。',f'统计值{target}出现次数')
 v=[rng.randrange(1,6) for _ in range(6)];out=len(set(v))
 num('異なる値の数',f'A ← {show(v)}\nc ← 0\nfor i を 1 から 6 まで 1 ずつ増やす\n  found ← false\n  for j を 1 から i−1 まで 1 ずつ増やす\n    if A[j] = A[i] then found ← true\n  if found = false then c ← c + 1\n表示(c)\n注: 終点が始点より小さい繰返しは0回。',out,f'異なる値は{show(sorted(set(v)))}。',f'不同的值为{show(sorted(set(v)))}')
 v=sorted(arr());target=rng.choice([x for x in range(1,19) if x not in v]);left=0;right=6;count=0
 while left<right:
  mid=(left+right)//2;count+=1
  if v[mid]<target:left=mid+1
  else:right=mid
 out=left+1
 num('二分探索の挿入位置',f'A ← {show(v)} （昇順）\n左 ← 1; 右 ← 7\nwhile 左 < 右\n  中 ← (左+右) ÷ 2 の小数点以下切捨て\n  if A[中] < {target} then 左 ← 中+1\n  else 右 ← 中\n表示(左)\n注: 右=7は末尾の次の挿入位置。',out,f'{target}以上の初めての位置、なければ7。',f'寻找第一个不小于{target}的位置，不存在时为7')
 v=arr();target=v[0]+v[-1];pairs=[(v[i],v[j]) for i in range(6) for j in range(i+1,6) if v[i]+v[j]==target]
 num('和が一致する組',f'A ← {show(v)}\nc ← 0\nfor i を 1 から 5 まで 1 ずつ増やす\n  for j を i+1 から 6 まで 1 ずつ増やす\n    if A[i]+A[j] = {target} then c ← c+1\n表示(c)',len(pairs),f'添字i<jの組のうち和が{target}の組を数える。',f'枚举i小于j且两项和为{target}的组合')
 v=arr();w=arr();target=rng.randrange(10,25);r=sum(v[i]*w[i] for i in range(6) if v[i]+w[i]>=target)
 num('2配列の条件集計',f'A ← {show(v)}; B ← {show(w)}\ns ← 0\nfor i を 1 から 6 まで 1 ずつ増やす\n  if A[i]+B[i] ≧ {target} then s ← s + A[i]×B[i]\n表示(s)',r,f'同じ添字で和が{target}以上の組だけ積を加える。',f'仅对同位置之和不少于{target}的项累加乘积')
 v=[rng.randrange(0,2) for _ in range(8)];longest=cur=0
 for x in v:cur=cur+1 if x==1 else 0;longest=max(longest,cur)
 num('連続長',f'A ← {show(v)}\n最長 ← 0; 連続 ← 0\nfor i を 1 から 8 まで 1 ずつ増やす\n  if A[i] = 1 then 連続 ← 連続 + 1\n  else 連続 ← 0\n  if 連続 > 最長 then 最長 ← 連続\n表示(最長)',longest,'1が連続する最大長を求める。','计算连续1的最大长度')
assert len(rows)==160
for l in Path('scripts/fe-section-b-security-cases-v3.tsv').read_text().splitlines():
 topic,p,correct,b,c,d,ex=l.split('|');jp,zh=ex.split('中文：',1);add('情報セキュリティ・'+topic,p,[correct,b,c,d],correct,jp.strip(),zh.strip())
assert len(rows)==200
cols='id,track_id,topic,difficulty,question_type,prompt,options_json,answer_json,explanation,source_type,source_reference,language,exam_section,exam_section_method,question_kind,exam_origin'
for part in (0,1):
 chunk=rows[part*100:(part+1)*100];Path(f'migrations/{216+part:04d}_fe_section_b_applied_{part+1}.sql').write_text('-- Original section B algorithm drills and security scenarios; not official IPA questions.\nINSERT OR IGNORE INTO questions ('+cols+') VALUES\n'+',\n'.join('('+','.join(map(quote,row))+')' for row in chunk)+';\n')
print('generated',len(rows),'FE B questions')
