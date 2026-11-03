/**
 * Original FE Subject B algorithm-tracing questions. Each template has two
 * deliberately different input cases and deterministic independent computation.
 * They are NOT IPA published questions; do not relabel as official.
 */
const questions = []
const topic = 'FE算法与程序设计'
const pad = n => String(n).padStart(3, '0')
const fmt = values => '{' + values.join(', ') + '}'
function add(name, prompt, answer, distractors, explanation) {
  const id = 'fe-growth1-b-algo-' + pad(questions.length + 1)
  if (typeof answer === 'number' && !Number.isFinite(answer)) throw Error('invalid answer ' + id)
  const correct = String(answer)
  const options = [correct, ...distractors.map(String).filter(value => value !== correct)]
  let offset = 1
  while (new Set(options).size < 4) options.push(String(typeof answer === 'number' ? answer + offset++ : correct + '-other-' + offset++))
  const distinct = [...new Set(options)].slice(0, 4)
  const offsetRotation = questions.length % 4
  const rotated = distinct.slice(offsetRotation).concat(distinct.slice(0, offsetRotation))
  const answerIndex = rotated.indexOf(correct)
  if (answerIndex < 0 || !prompt.includes('\n') || explanation.length < 20) throw Error('invalid trace ' + id)
  questions.push({id, section:'B', topic, prompt:'【知学オリジナル・FE 科目B】' + prompt, options:rotated,
    answer:answerIndex, explanation, template:name})
}

// 1. Divisible element summation.
for (const [n,k] of [[11,3],[15,4]]) {
  const values = Array.from({length:n},(_,i)=>i+1).filter(x=>x%k===0)
  const answer=values.reduce((a,b)=>a+b,0)
  add('divisible-sum','1から'+n+'までの整数を順に処理する。最後の total の値はどれか。\n\n' +
    'total ← 0\nfor i を 1 から '+n+' まで増やす\n  if i mod '+k+' = 0 ならば total ← total + i\nendfor\nreturn total',
    answer,[answer-k,answer+k,n],k+'の倍数だけを足す。対象は '+values.join('、')+' なので合計 '+answer+'。')
}
// 2. Prefix sums.
for (const [arr,left,right] of [[[4,1,7,2,6,3],2,5],[[6,3,1,8,5,2],3,6]]) {
  const prefix=[0];for(const x of arr)prefix.push(prefix.at(-1)+x)
  const ans=prefix[right]-prefix[left-1]
  add('prefix-sum','配列番号は1から始まる。累積和 p[0]=0, p[i]=p[i-1]+a[i] を作った。'+left+'番目から'+right+'番目までの合計を p[right]-p[left-1] で求めるといくつか。\n\na ← '+fmt(arr)+'\np[0] ← 0\nfor i を 1 から '+arr.length+' まで増やす\n  p[i] ← p[i-1] + a[i]\nendfor\nreturn p['+right+'] - p['+(left-1)+']',
    ans,[prefix[right],prefix[right]-prefix[left],ans+arr[left-1]],'累積和は '+fmt(prefix)+'。p['+right+']='+prefix[right]+'，p['+(left-1)+']='+prefix[left-1]+' なので差は '+ans+'。')
}
// 3. Binary search iteration count.
for(const [arr,target] of [[[2,5,7,11,14,18,21],14],[[3,6,9,12,15,18,21,24,27],6]]) {
  let l=0,r=arr.length-1,steps=0,trace=[]
  while(l<=r){const m=Math.floor((l+r)/2);steps++;trace.push('a['+(m+1)+']='+arr[m]);if(arr[m]===target)break;if(arr[m]<target)l=m+1;else r=m-1}
  add('binary-search','配列は昇順で番号は1から始まる。各反復で中央要素を1回比較する。値 '+target+' が見つかるまでの比較回数はどれか。\n\na ← '+fmt(arr)+'\nleft ← 1, right ← '+arr.length+'\nwhile left ≤ right\n  mid ← floor((left + right) / 2)\n  if a[mid] = '+target+' ならば終了\n  if a[mid] < '+target+' ならば left ← mid + 1\n  else right ← mid - 1\nendwhile',
    steps,[steps-1,steps+1,arr.length],'中央要素の比較順は '+trace.join(' → ')+'。一致まで '+steps+' 回比較する。')
}
// 4. Bubble sort swap count (inversions).
for(const arr of [[5,1,4,2,3],[4,3,1,5,2,6]]) {
  let a=[...arr],swaps=0
  for(let i=0;i<a.length-1;i++)for(let j=0;j<a.length-1-i;j++)if(a[j]>a[j+1]){[a[j],a[j+1]]=[a[j+1],a[j]];swaps++}
  add('bubble-swaps','隣り合う要素が逆順なら交換する昇順バブルソートを行う。交換の総回数はどれか。\n\na ← '+fmt(arr)+'\nfor i を 1 から '+(arr.length-1)+' まで増やす\n  for j を 1 から '+(arr.length-i)+' まで増やす\n    if a[j] > a[j+1] なら a[j] と a[j+1] を交換し count を1増やす\n  endfor\nendfor\nreturn count',
    swaps,[swaps-2,swaps+1,swaps+2],'隣接交換1回で逆転対が1組解消する。元の配列の逆転対は '+swaps+' 組なので交換は '+swaps+' 回。')
}
// 5. Rotation.
for(const [arr,k] of [[[10,20,30,40,50],2],[[3,6,9,12,15,18],4]]) {
  const n=arr.length;const rotated=arr.map((_,i)=>arr[(i-k%n+n)%n]);const answer=rotated[0]
  add('right-rotation','配列の要素を右に'+k+'位置循環移動し，先頭要素を表示する。表示値はどれか。\n\na ← '+fmt(arr)+'\nrepeat '+k+' 回\n  last ← a['+n+']\n  for i を '+n+' から 2 まで減らす\n    a[i] ← a[i-1]\n  endfor\n  a[1] ← last\nendrepeat\nreturn a[1]',
    answer,[arr[0],arr.at(-1),arr[k%n]],'右循環移動した結果は '+fmt(rotated)+'。先頭要素は '+answer+'。')
}
// 6. Stack operations.
for(const operations of [
  [['push',4],['push',8],['push',3],['pop'],['push',6],['pop']],
  [['push',2],['push',7],['pop'],['push',5],['push',9],['pop']]
]) {
  const stack=[];const trace=[]
  for(const [op,value] of operations){if(op==='push')stack.push(value);else stack.pop();trace.push(fmt(stack))}
  const answer=stack.at(-1)
  add('stack-top','空のスタックに次の操作を順に適用した直後の最上位の値はどれか。push(x) は x を積み，pop() は最上位を取り除く。\n\n'+operations.map(([op,v])=>op+(op==='push'?'('+v+')':'()')).join(' → ')+'\nreturn top()',
    answer,[answer+1,answer-2,operations.find(x=>x[0]==='push')[1]],'スタック（底→先頭）の推移は '+trace.join(' → ')+'。最終的な最上位は '+answer+'。')
}
// 7. Queue operations.
for(const operations of [
  [['enq',4],['enq',9],['deq'],['enq',7],['enq',3],['deq']],
  [['enq',5],['enq',6],['enq',2],['deq'],['enq',8],['deq']]
]){
  let queue=[],trace=[]
  for(const [op,value] of operations){if(op==='enq')queue.push(value);else queue.shift();trace.push(fmt(queue))}
  const answer=queue[0]
  add('queue-front','空の先入先出キューに次の操作を適用する。enq(x) は末尾に追加，deq() は先頭を削除する。最後の先頭要素はどれか。\n\n'+operations.map(([op,v])=>op+(op==='enq'?'('+v+')':'()')).join(' → ')+'\nreturn front()',
    answer,[answer+2,answer-2,operations.find(x=>x[0]==='enq')[1]],'キュー（先頭→末尾）の推移は '+trace.join(' → ')+'。最後の先頭は '+answer+'。')
}
// 8. Run length encoding.
for(const word of ['AAABBCCCCD','KKLLLMMMMNN']) {
  const groups=word.match(/(.)\1*/g);const answer=groups.map(g=>g[0]+g.length).join('')
  add('run-length','連続する同じ英字を「文字+連続回数」に置き換える。次のプログラムに文字列 '+word+' を与えた結果はどれか。\n\nresult ← 空文字列\n同じ文字が連続する各区間について\n  result ← result + その文字 + 区間の長さ\nendfor\nreturn result',
    answer,[word,groups.map(g=>g[0]+(g.length+1)).join(''),groups.map(g=>g.length+g[0]).join('')],
    '連続区間は '+groups.map(g=>g[0]+'が'+g.length+'個').join('、')+'。符号化すると '+answer+'。')
}
// 9. XOR checksum.
for(const numbers of [[5,3,6,1],[12,7,9,2]]) {
  const ans=numbers.reduce((x,y)=>x^y,0)
  add('xor-checksum','次の処理で XOR はビットごとの排他的論理和を表す。表示される整数はいくつか。\n\nvalues ← '+fmt(numbers)+'\nx ← 0\nfor 各 value in values\n  x ← x XOR value\nendfor\nreturn x',
    ans,[ans+1,ans+2,numbers.reduce((x,y)=>x+y,0)],'順に XOR を計算する。'+numbers.join(' XOR ')+' = '+ans+'。同じビット位置の1の数が奇数なら結果のビットは1。')
}
// 10. Population count.
for(const n of [45,58]){
  const bits=n.toString(2),answer=bits.split('1').length-1
  add('popcount','正整数 '+n+' を2進表現したとき，1のビット数を次の手順で数える。count はいくつになるか。\n\nx ← '+n+'\ncount ← 0\nwhile x > 0\n  count ← count + (x mod 2)\n  x ← floor(x / 2)\nendwhile\nreturn count',
    answer,[answer-1,answer+1,bits.length],n+' の2進表現は '+bits+'。1の数は '+answer+' 個なので count='+answer+'。')
}
// 11. Euclidean algorithm count.
for(const [x,y] of [[84,30],[77,28]]){
  let a=x,b=y,iterations=0,details=[]
  while(b!==0){const m=a%b;details.push(a+' mod '+b+'='+m);a=b;b=m;iterations++}
  add('euclid-steps','ユークリッド互除法で '+x+' と '+y+' の最大公約数を求める。剰余演算 mod が行われる回数はどれか。\n\na ← '+x+', b ← '+y+'\ncount ← 0\nwhile b ≠ 0\n  r ← a mod b\n  a ← b, b ← r\n  count ← count + 1\nendwhile\nreturn count',
    iterations,[iterations-1,iterations+1,iterations+2],details.join(' → ')+'。mod を '+iterations+' 回実行して終了する。')
}
// 12. Nested triangular loop.
for(const n of [5,8]){
  const answer=n*(n+1)/2
  add('triangle-loop','二重ループ内で count を1増やす処理は何回実行されるか。\n\ncount ← 0\nfor i を 1 から '+n+' まで増やす\n  for j を 1 から i まで増やす\n    count ← count + 1\n  endfor\nendfor\nreturn count',
    answer,[n*n,n*(n-1)/2,answer+n],'内側は i ごとに i 回実行される。1+2+…+'+n+' = '+n+'×'+(n+1)+'/2 = '+answer+'。')
}
// 13. Sliding-window maximum sum.
for(const [arr,k] of [[[3,1,7,2,6,4],3],[[2,8,1,5,4,9,3],2]]) {
  const sums=Array.from({length:arr.length-k+1},(_,i)=>arr.slice(i,i+k).reduce((a,b)=>a+b,0))
  const answer=Math.max(...sums)
  add('max-window','長さ '+k+' の連続する部分配列の和の最大値を求める。表示される値はどれか。\n\na ← '+fmt(arr)+'\nbest ← -∞\nfor i を 1 から '+(arr.length-k+1)+' まで増やす\n  s ← a[i] から a[i+'+(k-1)+'] までの合計\n  best ← max(best,s)\nendfor\nreturn best',
    answer,[Math.min(...sums),sums[0],answer+2],'各窓の和は '+fmt(sums)+'。最大は '+answer+'。')
}
// 14. Recurrence.
for(const n of [4,6]){
  let f=1,trace=[1];for(let i=1;i<=n;i++){f=2*f+1;trace.push(f)}
  add('recurrence','次の再帰関数 f に整数 '+n+' を渡す。返り値はどれか。\n\nf(0) = 1\nf(k) = 2 × f(k-1) + 1 （k ≥ 1）\nreturn f('+n+')',
    f,[f-2,f+2,2**n],'f(0) から順に '+fmt(trace)+'。f('+n+')='+f+'。')
}
// 15. Hash insertion collisions using linear probing.
for(const [keys,size] of [[[10,17,24,31],7],[[9,13,17,21,25],8]]){
  const table=new Array(size).fill(null);let collisions=0;let explanation=[]
  for(const key of keys){let pos=key%size,steps=0;while(table[pos]!==null){collisions++;steps++;pos=(pos+1)%size}table[pos]=key;explanation.push(key+'→'+pos+'（衝突'+steps+'）')}
  add('linear-probing','長さ '+size+' の空のハッシュ表に '+fmt(keys)+' を順に格納する。h(x)=x mod '+size+'，衝突時は次の添字を空きが見つかるまで1ずつ調べる（線形探索）。空きでない添字を調べた回数の合計はどれか。\n\nfor key in '+fmt(keys)+'\n  pos ← key mod '+size+'\n  while table[pos] が使用中\n    collisions ← collisions + 1\n    pos ← (pos + 1) mod '+size+'\n  endwhile\n  table[pos] ← key\nendfor\nreturn collisions',
    collisions,[collisions-1,collisions+1,collisions+2],explanation.join('、')+'。衝突した回数は合計 '+collisions+' 回。')
}
// 16. Count distinct values using a set.
for(const arr of [[2,2,3,5,3,8,2],[4,6,4,7,7,9,10,6]]){
  const answer=new Set(arr).size
  add('distinct-set','集合 seen に要素を追加し，同じ値は一つにまとめる。次の処理の戻り値はどれか。\n\nseen ← 空集合\nfor x in '+fmt(arr)+'\n  seen に x を追加\nendfor\nreturn seen の要素数',
    answer,[arr.length,answer+1,answer-1],'重複を除いた値は '+fmt([...new Set(arr)])+' の '+answer+' 種類。')
}
// 17. Longest increasing contiguous run.
for(const arr of [[1,3,5,2,4,6,7,1],[8,9,2,3,4,1,5,6,7,8]]){
  let best=1,length=1;for(let i=1;i<arr.length;i++){length=arr[i]>arr[i-1]?length+1:1;best=Math.max(best,length)}
  add('increasing-run','隣り合う値が直前より厳密に大きい場合だけ連続長を増やし，最大長を求める。結果はいくつか。\n\na ← '+fmt(arr)+'\ncurrent ← 1, best ← 1\nfor i を 2 から '+arr.length+' まで増やす\n  if a[i] > a[i-1] then current ← current + 1\n  else current ← 1\n  best ← max(best,current)\nendfor\nreturn best',
    best,[best-1,best+1,arr.length],'連続して増加する最長部分列の長さは '+best+'。途中で増加が止まると current は1へ戻る。')
}
// 18. 0/1 knapsack (small finite table independent enumeration).
for(const [weights,values,capacity] of [[[2,3,4],[4,5,7],5],[[1,3,4],[2,5,6],5]]){
  let best=0,bestKeys=[]
  for(let mask=0;mask<(1<<weights.length);mask++){
    let w=0,v=0,which=[]
    for(let i=0;i<weights.length;i++)if(mask&(1<<i)){w+=weights[i];v+=values[i];which.push(i+1)}
    if(w<=capacity&&v>best){best=v;bestKeys=which}
  }
  add('knapsack','各品物は高々1個だけ選べる。重さ合計を '+capacity+' 以下にし，価値の合計が最大になるよう選んだときの最大価値はどれか。\n\n品物の重さ ← '+fmt(weights)+'\n品物の価値 ← '+fmt(values)+'\n容量 ← '+capacity+'\n全ての品物の部分集合を調べ，重さが容量以下なら価値を比較して最大値を返す。',
    best,[best-1,best+2,values.reduce((a,b)=>a+b,0)],'全組合せを比較する。最良は品物番号 '+fmt(bestKeys)+' を選択し，合計価値 '+best+'，重量は容量以下。')
}
// 19. Selection sort first pass.
for(const arr of [[9,4,6,1,8],[7,3,10,5,2]]){
  let a=[...arr];const min=Math.min(...a),j=a.indexOf(min);[a[0],a[j]]=[a[j],a[0]];const answer=a[0]
  add('selection-first-pass','選択ソートの最初の1回だけ行った後の a[1] はどれか。配列番号は1から始まる。\n\na ← '+fmt(arr)+'\n最小の値がある位置 m を探す\na[1] と a[m] を交換する\nreturn a[1]',
    answer,[arr[0],arr[1],Math.max(...arr)],'最小要素 '+min+' を最初の要素と交換すると '+fmt(a)+'。a[1]='+answer+'。')
}
// 20. Count overlapping substring matches.
for(const [word,pattern] of [['ABABAABA','ABA'],['AAAAABA','AA']]){
  let count=0,positions=[]
  for(let i=0;i<=word.length-pattern.length;i++)if(word.slice(i,i+pattern.length)===pattern){count++;positions.push(i+1)}
  add('substring-matches','文字列中でパターンの一致開始位置を1文字ずつずらして確認する。重なり合う一致も数えた場合，件数はいくつか。\n\ntext ← "'+word+'"\npattern ← "'+pattern+'"\nfor i を 1 から '+(word.length-pattern.length+1)+' まで増やす\n  if text の i 文字目からの'+pattern.length+'文字が pattern と一致したら count を1増やす\nendfor\nreturn count',
    count,[count-1,count+1,pattern.length],'一致開始位置（1から数える）は '+fmt(positions)+'。重複していても数えるので計 '+count+' 件。')
}

if(questions.length!==40||new Set(questions.map(q=>q.id)).size!==40)throw Error('Expected 40 reviewed algorithmic exercises')
export const feGrowthAlgorithmQuestions=questions
