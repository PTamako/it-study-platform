-- 2023 B2/B3 and 2024 B2/B4 IPA published FE Subject B questions and answer keys.
-- Question program listings and full answer choices preserved in mobile-readable text.
-- No overwrite of past attempts or user learning state.
INSERT OR IGNORE INTO questions (id, track_id, topic, difficulty, question_type, prompt, options_json, answer_json, explanation, source_type, source_reference, language, exam_section, exam_section_method) VALUES ('fe-ipa-official-2023-b-02', 'exam-fe', 'FE算法与程序设计', 'standard', 'single_choice', '【2023年度 IPA公開問題 科目B 問2】次のプログラムにおいて手続 proc2 を呼び出すと，どの順で出力されるか。
〔プログラム〕
○proc1()
  "A" を出力する
  proc3()
○proc2()
  proc3()
  "B" を出力する
  proc1()
○proc3()
  "C" を出力する', '[{"id":"a","text":"A，B，B，C"},{"id":"b","text":"A，C"},{"id":"c","text":"A，C，B，C"},{"id":"d","text":"B，A，B，C"},{"id":"e","text":"B，C，B，A"},{"id":"f","text":"C，B"},{"id":"g","text":"C，B，A"},{"id":"h","text":"C，B，A，C"}]', '"h"', 'proc2から最初にproc3を呼んでCを出力，次にB，proc1でAを出力し，proc1からproc3を呼んでもう一度Cを出力する。', 'official', 'https://www.ipa.go.jp/shiken/mondai-kaiotu/sg_fe/koukai/t6hhco0000003zx0-att/2023r05_fe_kamoku_b_qs.pdf', 'ja', 'B', 'explicit');
INSERT OR IGNORE INTO questions (id, track_id, topic, difficulty, question_type, prompt, options_json, answer_json, explanation, source_type, source_reference, language, exam_section, exam_section_method) VALUES ('fe-ipa-official-2023-b-03', 'exam-fe', 'FE算法与程序设计', 'standard', 'single_choice', '【2023年度 IPA公開問題 科目B 問3】配列の要素番号は1から始まる。以下の手続 sort(1,5) を実行したとき，/*** α ***/ の行を最初に実行した直後に出力される data の内容を選べ。
〔プログラム〕
大域: 整数型の配列 data ← {2, 1, 3, 5, 4}
○sort(整数型: first, 整数型: last)
  整数型: pivot, i, j
  pivot ← data[(first ＋ last) ÷ 2 の商]
  i ← first
  j ← last
  while (true)
    while (data[i] ＜ pivot)
      i ← i ＋ 1
    endwhile
    while (pivot ＜ data[j])
      j ← j − 1
    endwhile
    if (i ≧ j)
      繰返し処理を終了
    endif
    data[i] と data[j] を入れ替える
    i ← i ＋ 1
    j ← j − 1
  endwhile
  data の全要素を順に空白区切りで出力する /*** α ***/
  if (first ＜ i − 1)
    sort(first, i − 1)
  endif
  if (j ＋ 1 ＜ last)
    sort(j ＋ 1, last)
  endif', '[{"id":"a","text":"1 2 3 4 5"},{"id":"b","text":"1 2 3 5 4"},{"id":"c","text":"2 1 3 4 5"},{"id":"d","text":"2 1 3 5 4"}]', '"d"', '初回 pivot=data[3]=3。iは3まで進み，jも3まで戻るので i≧j で分割を終了し，配列は変更されない。', 'official', 'https://www.ipa.go.jp/shiken/mondai-kaiotu/sg_fe/koukai/t6hhco0000003zx0-att/2023r05_fe_kamoku_b_qs.pdf', 'ja', 'B', 'explicit');
INSERT OR IGNORE INTO questions (id, track_id, topic, difficulty, question_type, prompt, options_json, answer_json, explanation, source_type, source_reference, language, exam_section, exam_section_method) VALUES ('fe-ipa-official-2024-b-02', 'exam-fe', 'FE算法与程序设计', 'standard', 'single_choice', '【2024年度 IPA公開問題 科目B 問2】関数 convDecimal は，“0”と“1”だけから成る1文字以上の文字列を符号なし2進数と解釈した整数値を返す。例えば“10010”なら18が返る。関数 int は文字“0”を0，“1”を1に変換する。空欄に入れる式はどれか。
〔プログラム〕
○整数型: convDecimal(文字列型: binary)
  整数型: i, length, result ← 0
  length ← binary の文字数
  for (i を1からlengthまで1ずつ増やす)
    result ← ［空欄］
  endfor
  return result', '[{"id":"a","text":"result ＋ int(binary の (length − i ＋ 1)文字目の文字)"},{"id":"b","text":"result ＋ int(binary の i文字目の文字)"},{"id":"c","text":"result × 2 ＋ int(binary の (length − i ＋ 1)文字目の文字)"},{"id":"d","text":"result × 2 ＋ int(binary の i文字目の文字)"}]', '"d"', '上位の桁から読み，現在の数を2倍して次のビットを加える。左からi文字目を扱う。', 'official', 'https://www.ipa.go.jp/shiken/mondai-kaiotu/sg_fe/koukai/eid2eo0000007g1d-att/2024r06_fe_kamoku_b_qs.pdf', 'ja', 'B', 'explicit');
INSERT OR IGNORE INTO questions (id, track_id, topic, difficulty, question_type, prompt, options_json, answer_json, explanation, source_type, source_reference, language, exam_section, exam_section_method) VALUES ('fe-ipa-official-2024-b-04', 'exam-fe', 'FE算法与程序设计', 'standard', 'single_choice', '【2024年度 IPA公開問題 科目B 問4】配列の要素番号は1から始まる。以下の merge({2,3},{1,4}) の実行時に，/*** α ***/ が何回実行されるか選べ。merge は昇順配列を併合し，昇順の配列を返す。
〔プログラム〕
○整数型の配列: merge(整数型の配列: data1, 整数型の配列: data2)
  整数型: n1 ← data1 の要素数
  整数型: n2 ← data2 の要素数
  整数型の配列: work ← {(n1＋n2)個の未定義の値}
  整数型: i ← 1
  整数型: j ← 1
  整数型: k ← 1
  while ((i ≦ n1) and (j ≦ n2))
    if (data1[i] ≦ data2[j])
      work[k] ← data1[i]
      i ← i ＋ 1
    else
      work[k] ← data2[j]
      j ← j ＋ 1
    endif
    k ← k ＋ 1
  endwhile
  while (i ≦ n1)
    work[k] ← data1[i]
    i ← i ＋ 1
    k ← k ＋ 1
  endwhile
  while (j ≦ n2)
    work[k] ← data2[j] /*** α ***/
    j ← j ＋ 1
    k ← k ＋ 1
  endwhile
  return work', '[{"id":"a","text":"実行されない"},{"id":"b","text":"1回実行される"},{"id":"c","text":"2回実行される"},{"id":"d","text":"3回実行される"}]', '"b"', '比較ループでは1,2,3を順に取り込んでdata1を使い切る。data2に残った4を最後のwhileで1回だけ追加する。', 'official', 'https://www.ipa.go.jp/shiken/mondai-kaiotu/sg_fe/koukai/eid2eo0000007g1d-att/2024r06_fe_kamoku_b_qs.pdf', 'ja', 'B', 'explicit');
