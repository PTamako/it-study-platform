-- Complete IPA 2025 FE B questions 3-4: stack push/pop and brute-force substring search.
-- Official answer PDF: B3=イ (b), B4=ク (h).
-- ASCII/text describes the stack diagram and preserves all options.
-- Safe INSERT OR IGNORE, no update or deletion of stored history.
INSERT OR IGNORE INTO questions (id, track_id, topic, difficulty, question_type, prompt, options_json, answer_json, explanation, source_type, source_reference, language, exam_section, exam_section_method) VALUES ('fe-ipa-official-2025-b-03','exam-fe','FE算法与程序设计','standard','single_choice','【2025年度 IPA公開問題 科目B 問3】次のプログラム中の空欄 a と b に入れる正しい答えの組合せを選べ。配列は1から始まる。
関数 push は整数をスタックに格納し，格納できれば true，満杯なら false を返す。関数 pop はスタックから値を一つ取り出し，空のときは未定義の値を返す。
スタックは要素数4の配列 stack と，次に格納する位置を示す stackPos で表す。
初期配列（要素番号1/2/3/4）：4 / 3 / 未定義 / 未定義，stackPos=3。配列の領域外を参照してはならない。

〔プログラム〕
大域: 整数型: stackPos ← 3
大域: 整数型の配列: stack ← {4, 3, 未定義の値, 未定義の値}

○論理型: push(整数型: inputData)
  if (stackPos ≦ stackの要素数)
    stack[［a］] ← inputData
    stackPos ← stackPos ＋ 1
    return true
  else
    return false
  endif

○整数型: pop()
  整数型: popData ← 未定義の値
  if (stackPos ＞ 1)
    stackPos ← ［b］
    popData ← stack[stackPos]
    stack[stackPos] ← 未定義の値
  endif
  return popData','[{"id":"a","text":"a: stackPos，b: stackPos ＋ 1"},{"id":"b","text":"a: stackPos，b: stackPos − 1"},{"id":"c","text":"a: stackPos − 1，b: stackPos ＋ 1"},{"id":"d","text":"a: stackPos − 1，b: stackPos − 1"}]','"b"','stackPos は次の空き要素番号なので push では stack[stackPos] に格納する。pop 時はまず stackPos を1減らして最後の格納位置を参照する。','official','https://www.ipa.go.jp/shiken/mondai-kaiotu/sg_fe/koukai/tbl5kb0000005r9r-att/2025r07_fe_kamoku_b_qs.pdf','ja','B','explicit');
INSERT OR IGNORE INTO questions (id, track_id, topic, difficulty, question_type, prompt, options_json, answer_json, explanation, source_type, source_reference, language, exam_section, exam_section_method) VALUES ('fe-ipa-official-2025-b-04','exam-fe','FE算法与程序设计','standard','single_choice','【2025年度 IPA公開問題 科目B 問4】次の記述中の空欄に入れる正しい答えを選べ。配列の要素番号は1から始まる。
関数 search は文字型の配列 data と key を受け取り，data 内で key と一致する連続部分配列の開始要素番号を全て格納した配列を返す。
search({"a","b","a","b","c","a","b","c"},{"a","b","c"}) を実行するとき，プログラム中で /*** β ***/ の条件式が真になる回数はいくつか。

〔プログラム〕
○整数型の配列: search(文字型の配列: data, 文字型の配列: key)
  整数型: i, j, lenData, lenKey
  整数型の配列: result ← {}
  lenData ← data の要素数
  lenKey ← key の要素数
  for (i を 1 から (lenData − lenKey ＋ 1) まで 1 ずつ増やす)  // α
    for (j を 1 から lenKey まで 1 ずつ増やす)
      if (data[i ＋ j − 1] が key[j] と等しい)  // β
        if (j が lenKey と等しい)
          result の末尾に i の値を追加
        endif
      else
        αの行から始まる繰返し処理を終了する
      endif
    endfor
  endfor
  return result','[{"id":"a","text":"1"},{"id":"b","text":"2"},{"id":"c","text":"3"},{"id":"d","text":"4"},{"id":"e","text":"5"},{"id":"f","text":"6"},{"id":"g","text":"7"},{"id":"h","text":"8"},{"id":"i","text":"9"},{"id":"j","text":"10"}]','"h"','i=1で先頭2文字一致、i=3で3文字一致、i=6で3文字一致する。β の真は合計2+3+3=8回。','official','https://www.ipa.go.jp/shiken/mondai-kaiotu/sg_fe/koukai/tbl5kb0000005r9r-att/2025r07_fe_kamoku_b_qs.pdf','ja','B','explicit');
