-- Four complete FE published B algorithm questions: 2023 B4/B5 and 2024 B3/B5.
-- Official answer keys 2023 エ/エ and 2024 エ/オ.
-- The text representation preserves formulas, tables, source pseudocode and answer choices.
-- INSERT OR IGNORE: does not change existing study attempts.
INSERT OR IGNORE INTO questions (id, track_id, topic, difficulty, question_type, prompt, options_json, answer_json, explanation, source_type, source_reference, language, exam_section, exam_section_method) VALUES ('fe-ipa-official-2023-b-04', 'exam-fe', 'FE算法与程序设计', 'standard', 'single_choice', '【2023年度 IPA公開問題 科目B 問4】関数addを使用して正の整数をハッシュ表に登録する。hashArrayは5要素で添字は1から始まり，未使用の要素は−1。手続testを実行した直後のhashArrayはどれか。

〔プログラム〕
大域: 整数型の配列 hashArray
○論理型: add(整数型: value)
  整数型 i ← calcHash1(value)
  if (hashArray[i] ＝ −1)
    hashArray[i] ← value
    return true
  else
    i ← calcHash2(value)
    if (hashArray[i] ＝ −1)
      hashArray[i] ← value
      return true
    endif
  endif
  return false

○整数型: calcHash1(整数型: value)
  return (value mod hashArrayの要素数) ＋ 1

○整数型: calcHash2(整数型: value)
  return ((value ＋ 3) mod hashArrayの要素数) ＋ 1

○test()
  hashArray ← {−1,−1,−1,−1,−1}
  add(3)
  add(18)
  add(11)', '[{"id":"a","text":"{−1, 3, −1, 18, 11}"},{"id":"b","text":"{−1, 11, −1, 3, −1}"},{"id":"c","text":"{−1, 11, −1, 18, −1}"},{"id":"d","text":"{−1, 18, −1, 3, 11}"},{"id":"e","text":"{−1, 18, 11, 3, −1}"}]', '"d"', '3 は添字4，18は添字4が使用済みなので第2ハッシュ添字2，11は第1ハッシュ添字2が使用済みなので第2ハッシュ添字5。結果は{−1,18,−1,3,11}。', 'official', 'https://www.ipa.go.jp/shiken/mondai-kaiotu/sg_fe/koukai/t6hhco0000003zx0-att/2023r05_fe_kamoku_b_qs.pdf', 'ja', 'B', 'explicit');
INSERT OR IGNORE INTO questions (id, track_id, topic, difficulty, question_type, prompt, options_json, answer_json, explanation, source_type, source_reference, language, exam_section, exam_section_method) VALUES ('fe-ipa-official-2023-b-05', 'exam-fe', 'FE算法与程序设计', 'standard', 'single_choice', '【2023年度 IPA公開問題 科目B 問5】関数calcCosineSimilarityで，二つの実数型配列vector1とvector2（共に同じ要素数n）のコサイン類似度を計算する。配列はともに零ベクトルではない。空欄a，bの組合せはどれか。

コサイン類似度＝Σ(aᵢbᵢ)／(√Σaᵢ²×√Σbᵢ²)

〔プログラム〕
○実数型: calcCosineSimilarity(実数型の配列: vector1, 実数型の配列: vector2)
  実数型 similarity, numerator, denominator, temp ← 0
  整数型 i
  numerator ← 0
  for (i を1からvector1の要素数まで)
    numerator ← numerator ＋ ［a］
  endfor
  for (i を1からvector1の要素数まで)
    temp ← temp ＋ vector1[i]の2乗
  endfor
  denominator ← tempの正の平方根
  temp ← 0
  for (i を1からvector2の要素数まで)
    temp ← temp ＋ vector2[i]の2乗
  endfor
  denominator ← ［b］
  similarity ← numerator ÷ denominator
  return similarity', '[{"id":"a","text":"a: √(vector1[i]×vector2[i])，b: denominator×√temp"},{"id":"b","text":"a: √(vector1[i]×vector2[i])，b: denominator＋√temp"},{"id":"c","text":"a: √(vector1[i]×vector2[i])，b: √temp"},{"id":"d","text":"a: vector1[i]×vector2[i]，b: denominator×√temp"},{"id":"e","text":"a: vector1[i]×vector2[i]，b: denominator＋√temp"},{"id":"f","text":"a: vector1[i]×vector2[i]，b: √temp"},{"id":"g","text":"a: vector1[i]²，b: denominator×√temp"},{"id":"h","text":"a: vector1[i]²，b: denominator＋√temp"},{"id":"i","text":"a: vector1[i]²，b: √temp"}]', '"d"', '分子はベクトルの要素ごとの積を合計する。分母は両方のノルム（各平方和の平方根）の積。したがって a=vector1[i]×vector2[i]，b=denominator×√temp。', 'official', 'https://www.ipa.go.jp/shiken/mondai-kaiotu/sg_fe/koukai/t6hhco0000003zx0-att/2023r05_fe_kamoku_b_qs.pdf', 'ja', 'B', 'explicit');
INSERT OR IGNORE INTO questions (id, track_id, topic, difficulty, question_type, prompt, options_json, answer_json, explanation, source_type, source_reference, language, exam_section, exam_section_method) VALUES ('fe-ipa-official-2024-b-03', 'exam-fe', 'FE算法与程序设计', 'standard', 'single_choice', '【2024年度 IPA公開問題 科目B 問3】無向グラフの各辺を要素数2の整数型配列で表し，辺の配列edgeListを隣接行列に変換する。関数edgesToMatrixの空欄に入れる処理はどれか。配列要素番号は1から始まり，自己ループはない。

〔図・入力例〕
頂点1,2,3,4,5
辺：{{1,3},{1,4},{3,4},{2,4},{4,5}}
隣接行列（行1～5）：
0 0 1 1 0
0 0 0 1 0
1 0 0 1 0
1 1 1 0 1
0 0 0 1 0

〔プログラム〕
○整数型の二次元配列: edgesToMatrix(整数型配列の配列: edgeList, 整数型: nodeNum)
  整数型の二次元配列 adjMatrix ← {nodeNum行nodeNum列の0}
  整数型 i, u, v
  for (iを1からedgeListの要素数まで)
    u ← edgeList[i][1]
    v ← edgeList[i][2]
    ［空欄］
  endfor
  return adjMatrix', '[{"id":"a","text":"adjMatrix[u,u] ← 1"},{"id":"b","text":"adjMatrix[u,u] ← 1；adjMatrix[v,v] ← 1"},{"id":"c","text":"adjMatrix[u,v] ← 1"},{"id":"d","text":"adjMatrix[u,v] ← 1；adjMatrix[v,u] ← 1"},{"id":"e","text":"adjMatrix[v,u] ← 1"},{"id":"f","text":"adjMatrix[v,v] ← 1"}]', '"d"', '無向グラフは(u,v)と(v,u)の両方向に辺がある。隣接行列が対称になるよう二つの値を1にする。', 'official', 'https://www.ipa.go.jp/shiken/mondai-kaiotu/sg_fe/koukai/eid2eo0000007g1d-att/2024r06_fe_kamoku_b_qs.pdf', 'ja', 'B', 'explicit');
INSERT OR IGNORE INTO questions (id, track_id, topic, difficulty, question_type, prompt, options_json, answer_json, explanation, source_type, source_reference, language, exam_section, exam_section_method) VALUES ('fe-ipa-official-2024-b-05', 'exam-fe', 'FE算法与程序设计', 'standard', 'single_choice', '【2024年度 IPA公開問題 科目B 問5】注文データから，ある商品itemと最も関連度が高い別商品とその関連度を出力する手続putRelatedItemの空欄a,b,cの組合せはどれか。

〔注文データ例〕
注文1：A,B,D
注文2：A,D
注文3：A
注文4：A,B,E
注文5：B
注文6：C,E
全6注文。ある商品x,yの関連度 Lxy＝Mxy×全注文数／(Kx×Ky)。
Mxy：x,yが同一注文にある注文数。Kx：xの注文数，Ky：yの注文数。
例：L_AB＝2×6／(4×3)＝1.0。

〔プログラム〕
大域: orders ← {{"A","B","D"},{"A","D"},{"A"},{"A","B","E"},{"B"},{"C","E"}}
○putRelatedItem(文字列型: item)
  allItems ← orders中の全商品を重複なく辞書順に並べた配列
  otherItems ← allItemsからitemを除いた配列
  整数型 itemCount ← 0
  整数型配列 arrayK ← {otherItemsの要素数個の0}
  整数型配列 arrayM ← {otherItemsの要素数個の0}
  実数型 valueL, maxL ← −∞
  文字列型 relatedItem
  for (order に orders の要素を順に代入)
    if (order に item が含まれる)
      itemCountを1増やす
    endif
    for (iを1からotherItemsの要素数まで)
      if (order に otherItems[i] が含まれる)
        if (order に item が含まれる)
          ［a］を1増やす
        endif
        ［b］を1増やす
      endif
    endfor
  endfor
  for (iを1からotherItemsの要素数まで)
    valueL ← (arrayM[i] × ［c］) ÷ (itemCount × arrayK[i])
    if (valueL > maxL)
      maxL ← valueL
      relatedItem ← otherItems[i]
    endif
  endfor
  relatedItemとmaxLを出力する', '[{"id":"a","text":"a: arrayK[i], b: arrayM[i], c: allItemsの要素数"},{"id":"b","text":"a: arrayK[i], b: arrayM[i], c: ordersの要素数"},{"id":"c","text":"a: arrayK[i], b: arrayM[i], c: otherItemsの要素数"},{"id":"d","text":"a: arrayM[i], b: arrayK[i], c: allItemsの要素数"},{"id":"e","text":"a: arrayM[i], b: arrayK[i], c: ordersの要素数"},{"id":"f","text":"a: arrayM[i], b: arrayK[i], c: otherItemsの要素数"}]', '"e"', 'arrayMはitemと同時購入の件数，arrayKは他商品単独の購入件数，Lの分子には全注文数が必要。だから（arrayM,arrayK,ordersの要素数）。', 'official', 'https://www.ipa.go.jp/shiken/mondai-kaiotu/sg_fe/koukai/eid2eo0000007g1d-att/2024r06_fe_kamoku_b_qs.pdf', 'ja', 'B', 'explicit');
