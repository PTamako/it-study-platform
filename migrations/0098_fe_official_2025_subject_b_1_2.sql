-- IPA 2025 FE Subject B original questions 1 and 2, full pseudocode and every answer choice.
-- Correct answers from official 2025 B answer PDF: Q1=カ (f), Q2=ア (a).
-- Source https://www.ipa.go.jp/shiken/mondai-kaiotu/sg_fe/koukai/2025r07.html
-- New stable IDs; never delete, replace or modify existing progress.
INSERT OR IGNORE INTO questions (id, track_id, topic, difficulty, question_type, prompt, options_json, answer_json, explanation, source_type, source_reference, language, exam_section, exam_section_method) VALUES ('fe-ipa-official-2025-b-01', 'exam-fe', 'FE算法与程序设计', 'standard', 'single_choice', '【2025年度 IPA公開問題 科目B 問1】次のプログラム中の空欄 a と b に入れる正しい答えの組合せを選べ。
関数 function1 と function2 は，同じ正の整数 n，m を引数として受け取り，同じ値を返す。m は n よりも 10 以上大きい。

〔プログラム〕
○整数型: function1(整数型: n, 整数型: m)
  整数型: count ← 0
  整数型: i
  for (i を n から m まで 1 ずつ増やす)
    if ((i mod 4) が 0 と等しい)
      count ← count ＋ 1
    endif
  endfor
  return count

○整数型: function2(整数型: n, 整数型: m)
  整数型: count ← 0
  整数型: tempN ← n
  整数型: i, j
  for (［a］)
    if ((tempN mod 4) が 0 と等しい)
      繰返し処理を終了する
    endif
    tempN ← tempN ＋ 1
  endfor
  for (［b］)
    count ← count ＋ 1
  endfor
  return count', '[{"id":"a","text":"a: i を 1 から 2 まで増やす；b: j を n から m 以下の範囲で tempN ずつ増やす"},{"id":"b","text":"a: i を 1 から 2 まで増やす；b: j を tempN から m まで 1 ずつ増やす"},{"id":"c","text":"a: i を 1 から 2 まで増やす；b: j を tempN から m 以下の範囲で 4 ずつ増やす"},{"id":"d","text":"a: i を 1 から 3 まで増やす；b: j を n から m 以下の範囲で tempN ずつ増やす"},{"id":"e","text":"a: i を 1 から 3 まで増やす；b: j を tempN から m まで 1 ずつ増やす"},{"id":"f","text":"a: i を 1 から 3 まで増やす；b: j を tempN から m 以下の範囲で 4 ずつ増やす"}]', '"f"', '次に4で割り切れる整数までの差は最大3なので，最初のループは3回の探索でよい。見つけた最初の倍数 tempN から4ずつ増やせば関数 function1 と一致する。', 'official', 'https://www.ipa.go.jp/shiken/mondai-kaiotu/sg_fe/koukai/tbl5kb0000005r9r-att/2025r07_fe_kamoku_b_qs.pdf', 'ja', 'B', 'explicit');
INSERT OR IGNORE INTO questions (id, track_id, topic, difficulty, question_type, prompt, options_json, answer_json, explanation, source_type, source_reference, language, exam_section, exam_section_method) VALUES ('fe-ipa-official-2025-b-02', 'exam-fe', 'FE算法与程序设计', 'standard', 'single_choice', '【2025年度 IPA公開問題 科目B 問2】次のプログラム中の空欄に入れる正しい答えを選べ。
関数 change は 10 より大きい整数 n を引数で受け取り，1円玉，5円玉，10円玉を使ってちょうど n 円にする組合せの総数を返す。
例えば12円の場合は，10円玉を使わない場合は5円玉0～2枚の3通り，10円玉1枚の場合は5円玉0枚の1通りなので，計4通りとなる。

〔プログラム〕
○整数型: change(整数型: n)
  整数型: count ← 0
  整数型: rest ← n
  while (［空欄］)
    count ← count ＋ (rest ÷ 5 の商) ＋ 1
    rest ← rest − 10
  endwhile
  return count', '[{"id":"a","text":"rest ≧ 0"},{"id":"b","text":"rest ≧ 5"},{"id":"c","text":"rest ≧ 10"},{"id":"d","text":"rest ＞ 0"},{"id":"e","text":"rest ＞ 5"},{"id":"f","text":"rest ＞ 10"}]', '"a"', '10円玉の枚数を0枚から試し，残額 rest が0円のケースも「ちょうど払える1通り」として数える。よって rest≧0。', 'official', 'https://www.ipa.go.jp/shiken/mondai-kaiotu/sg_fe/koukai/tbl5kb0000005r9r-att/2025r07_fe_kamoku_b_qs.pdf', 'ja', 'B', 'explicit');
