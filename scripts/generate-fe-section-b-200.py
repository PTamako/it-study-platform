"""Generate original FE section B algorithm tracing drills, not IPA exam questions."""
from pathlib import Path
import json,random

rng=random.Random(20261122)
q=lambda x:"'"+str(x).replace("'","''")+"'"
rows=[]
used=set()

def add(topic, code, answer, jp, zh):
 n=len(rows)+1
 assert isinstance(answer,int) and answer>=0
 prompt='【知学オリジナル・科目B】配列の添字は1から始まる。次の処理が終わったとき、表示される整数はどれか。\n'+code
 assert prompt not in used
 used.add(prompt)
 # Adjacent plausible answers are displayed in shuffled order, independently of the result.
 choices=[answer]
 for candidate in (answer-1,answer+1,answer-2,answer+2,answer+3,answer+4):
  if candidate>=0 and candidate not in choices:choices.append(candidate)
  if len(choices)==4:break
 random.Random(700000+n).shuffle(choices)
 options=json.dumps([{'id':k,'text':str(v)} for k,v in zip('abcd',choices)],ensure_ascii=False,separators=(',',':'))
 key=json.dumps('abcd'[choices.index(answer)])
 explanation=jp+' 表示は'+str(answer)+'。中文：'+zh+'，输出为'+str(answer)+'。'
 rows.append([f'fe-b-original-20261122-{n:03d}','exam-fe',topic,'standard','single_choice',prompt,options,key,explanation,'generated','知学オリジナル練習問題（IPA公式過去問ではありません）','ja','B','explicit','standard','general'])

def arr():
 # Distinct values keep sorting and extrema questions unambiguous.
 return rng.sample(range(1,18),6)

def show(a):return '{'+', '.join(map(str,a))+'}'

for variant in range(10):
 a=arr(); t=rng.randrange(4,14);pick=[x for x in a if x>=t]
 add('配列の条件集計',f'A ← {show(a)}\ns ← 0\nfor i を 1 から 6 まで 1 ずつ増やす\n  if A[i] ≧ {t} then s ← s + A[i]\n表示(s)',sum(pick),f'{t}以上は{show(pick)}で合計を取る。',f'筛选不小于{t}的元素{show(pick)}并求和')
 a=arr(); t=rng.randrange(5,13);pick=[x for x in a if x<t]
 add('配列の条件集計',f'A ← {show(a)}\nc ← 0\nfor i を 1 から 6 まで 1 ずつ増やす\n  if A[i] < {t} then c ← c + 1\n表示(c)',len(pick),f'{t}未満は{show(pick)}。',f'小于{t}的元素为{show(pick)}')
 a=arr(); dif=[abs(a[i]-a[i-1]) for i in range(1,6)]
 add('隣接要素',f'A ← {show(a)}\ns ← 0\nfor i を 2 から 6 まで 1 ずつ増やす\n  s ← s + abs(A[i] − A[i−1])\n表示(s)\n注: absは絶対値',sum(dif),f'隣接差の絶対値は{show(dif)}。',f'相邻差的绝对值依次为{show(dif)}')
 a=arr(); rises=sum(a[i]>a[i-1] for i in range(1,6))
 add('隣接要素',f'A ← {show(a)}\nc ← 0\nfor i を 2 から 6 まで 1 ずつ増やす\n  if A[i] > A[i−1] then c ← c + 1\n表示(c)',rises,'前の要素より大きい位置を数える。','逐一比较相邻值，统计上升次数')
 a=arr(); maxv=max(a); minv=min(a)
 add('最大値と最小値',f'A ← {show(a)}\nhi ← A[1]; lo ← A[1]\nfor i を 2 から 6 まで 1 ずつ増やす\n  if A[i] > hi then hi ← A[i]\n  if A[i] < lo then lo ← A[i]\n表示(hi − lo)',maxv-minv,f'最大値{maxv}、最小値{minv}の差。',f'最大值{maxv}减最小值{minv}')
 a=arr(); pos=rng.randrange(2,6);t=sorted(a)[pos]; idx=next(i for i,x in enumerate(a,1) if x>=t)
 add('線形探索',f'A ← {show(a)}\np ← 0\nfor i を 1 から 6 まで 1 ずつ増やす\n  if A[i] ≧ {t} then p ← i; 繰返しを終了する\n表示(p)',idx,f'{t}以上が最初に現れる添字を求める。',f'从左到右寻找第一个不小于{t}的元素位置')
 a=arr(); val=rng.choice(a);idx=a.index(val)+1
 add('線形探索',f'A ← {show(a)}\np ← 0\ni ← 1\nwhile i ≦ 6\n  if A[i] = {val} then p ← i; 繰返しを終了する\n  i ← i + 1\n表示(p)',idx,f'{val}と一致する最初の添字。',f'第一个等于{val}的位置')
 a=arr();a.sort(); target=rng.choice(a);left,right=1,6;visits=0
 while left<=right:
  visits+=1;mid=(left+right)//2
  if a[mid-1]==target:break
  if a[mid-1]<target:left=mid+1
  else:right=mid-1
 add('二分探索',f'A ← {show(a)} （昇順）\n左 ← 1; 右 ← 6; 回数 ← 0\nwhile 左 ≦ 右\n  中 ← (左 + 右) ÷ 2 の小数点以下切捨て\n  回数 ← 回数 + 1\n  if A[中] = {target} then 繰返しを終了する\n  if A[中] < {target} then 左 ← 中 + 1\n  else 右 ← 中 − 1\n表示(回数)',visits,f'{target}を発見するまで中央を比較した回数。',f'按照给定的二分探索过程统计找到{target}时的比较次数')
 a=arr();p=rng.randrange(1,5);a[p-1],a[p]=a[p],a[p-1]
 add('配列の交換',f'A ← {show([*a[:p-1],a[p],a[p-1],*a[p+1:]])}\nt ← A[{p}]; A[{p}] ← A[{p+1}]; A[{p+1}] ← t\n表示(A[{p}])',a[p-1],f'{p}番目と{p+1}番目を交換する。',f'交换第{p}和第{p+1}项后读取第{p}项')
 a=arr(); seq=a[:];i=rng.randrange(2,6);del seq[i-1]
 add('配列要素の削除',f'A ← {show(a)}\n{ i }番目の要素を削除し、以後の要素を前へ詰める\n表示(A[{i}])',seq[i-1],f'削除後は元の{i+1}番目が{i}番目へ移る。',f'删除第{i}项后原第{i+1}项前移')
 a=arr(); s=0;lst=[]
 for x in a:
  s+=x;lst.append(s)
 pos=rng.randrange(2,6)
 add('累積和',f'A ← {show(a)}\ns ← 0\nfor i を 1 から {pos} まで 1 ずつ増やす\n  s ← s + A[i]\n表示(s)',lst[pos-1],f'先頭から{pos}個の合計。',f'累加前{pos}个元素')
 a=arr(); k=rng.randrange(5,15); s=0;count=0
 for x in a:
  if x>k:break
  s+=x;count+=1
 add('条件付き反復',f'A ← {show(a)}\ns ← 0\nfor i を 1 から 6 まで 1 ずつ増やす\n  if A[i] > {k} then 繰返しを終了する\n  s ← s + A[i]\n表示(s)',s,f'{k}を超える値を足す前に停止し、先頭{count}個を加える。',f'遇到大于{k}的值立即停止，不计入该值；共累加前{count}项')
 a=arr();k=rng.randrange(2,5);v=sum(a[::k])
 add('配列の間隔走査',f'A ← {show(a)}\ns ← 0\nfor i を 1 から 6 まで {k} ずつ増やす\n  s ← s + A[i]\n表示(s)',v,f'添字1から{k}ずつ進む位置を足す。',f'从第1项开始每次前进{k}项并求和')
 a=arr();b=a[:];b.reverse();pos=rng.randrange(1,7)
 add('配列の反転',f'A ← {show(a)}\nfor i を 1 から 3 まで 1 ずつ増やす\n  t ← A[i]; A[i] ← A[7−i]; A[7−i] ← t\n表示(A[{pos}])',b[pos-1],f'要素を逆順にすると{show(b)}。',f'交换两端后数组变为{show(b)}')
 a=arr();s=0
 for x in a:s=(s+x)%10
 add('チェックサム',f'A ← {show(a)}\ns ← 0\nfor i を 1 から 6 まで 1 ずつ増やす\n  s ← (s + A[i]) mod 10\n表示(s)',s,f'合計{sum(a)}を10で割った余り。',f'数组总和{sum(a)}除以10的余数')
 a=arr(); b=a[:];tmp=b[0];b[:-1]=b[1:];b[-1]=tmp;pos=rng.randrange(1,7)
 add('配列の回転',f'A ← {show(a)}\nt ← A[1]\nfor i を 1 から 5 まで 1 ずつ増やす\n  A[i] ← A[i+1]\nA[6] ← t\n表示(A[{pos}])',b[pos-1],f'1個左に回すと{show(b)}。',f'左旋转一位后数组为{show(b)}')
 a=arr(); st=[]
 for x in a[:3]:st.append(x)
 st.pop();st.extend(a[3:5]);out=st.pop()
 add('スタック',f'空のスタックSに{a[0]}、{a[1]}、{a[2]}を順にpushする。1回popして捨て、{a[3]}、{a[4]}を順にpushする。その後popした値を表示する。',out,'pushの後に最後に入れた値を取り出す。','栈后进先出，最后压入的元素先弹出')
 a=arr(); queue=a[:3];queue.pop(0);queue+=a[3:5];out=queue.pop(0)
 add('キュー',f'空のキューQに{a[0]}、{a[1]}、{a[2]}を順に入れる。1回取り出して捨て、{a[3]}、{a[4]}を順に追加する。その後取り出した値を表示する。',out,'最初の取出し後も追加順を保つ。','队列先进先出，第一次取出后按原顺序排队')
 a=arr(); p=rng.randrange(2,6);b=a[:];b[p-1]=b[p-2]+b[p]
 add('配列の近傍更新',f'A ← {show(a)}\nA[{p}] ← A[{p-1}] + A[{p+1}]\n表示(A[{p}])',b[p-1],f'{p-1}番目と{p+1}番目を加える。',f'将第{p-1}项和第{p+1}项相加')
 a=arr();b=a[:];b.sort();pos=rng.randrange(1,7)
 add('選択と整列',f'A ← {show(a)}\nAを数値の昇順に並べ替える\n表示(A[{pos}])',b[pos-1],f'昇順は{show(b)}。',f'升序排列为{show(b)}')
assert len(rows)==200 and len(used)==200
cols='id,track_id,topic,difficulty,question_type,prompt,options_json,answer_json,explanation,source_type,source_reference,language,exam_section,exam_section_method,question_kind,exam_origin'
for part in (0,1):
 chunk=rows[part*100:(part+1)*100]; name=f'migrations/{212+part:04d}_fe_section_b_algorithm_drills_{part+1}.sql'
 Path(name).write_text('-- Original section B algorithm drills with varied input cases; not official IPA questions.\nINSERT OR IGNORE INTO questions ('+cols+') VALUES\n'+',\n'.join('('+','.join(map(q,row))+')' for row in chunk)+';\n')
print('wrote',len(rows),'section B drills in two migrations')
