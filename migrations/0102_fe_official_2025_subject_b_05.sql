-- 2025 IPA published FE B question 5. Source: https://www.ipa.go.jp/shiken/mondai-kaiotu/sg_fe/koukai/tbl5kb0000005r9r-att/2025r07_fe_kamoku_b_qs.pdf
-- Official answer: オ (e), verified against IPA's answer key.
-- Contains full contingency table, formula/pseudocode and all seven choices.
-- Preserves study attempts, progress and existing questions.
INSERT OR IGNORE INTO questions (id, track_id, topic, difficulty, question_type, prompt, options_json, answer_json, explanation, source_type, source_reference, language, exam_section, exam_section_method) VALUES ('fe-ipa-official-2025-b-05', 'exam-fe', 'FE算法与程序设计', 'standard', 'single_choice', '【2025年度 IPA公開問題 科目B 問5】次の記述中の a と b に入れる正しい答えの組合せを，解答群から選べ。ここで，配列の要素番号は1から始まる。

病気Xにかかるかどうかが，予防接種の有無に影響されないと仮定した場合の理論度数を計算する。関数 f は，引数 data の集計表から理論度数を二次元配列で返す。

〔表1 集計結果：単位 人〕
                         病気Xにかからなかった | 病気Xにかかった
予防接種を受けた                         82 | 6
予防接種を受けていない                   58 | 8

〔表2 理論度数：単位 人〕
                         病気Xにかからなかった | 病気Xにかかった
予防接種を受けた                          a | （省略）
予防接種を受けていない                  （省略） | b

〔プログラム〕
○実数型の二次元配列: f(実数型の二次元配列: data)
  実数型: t ← dataの要素の和
  整数型: row ← dataの行数
  整数型: col ← dataの列数
  実数型の二次元配列: result ← {row行col列の未定義の値}
  整数型: r, c
  for (r を1からrowまで1ずつ増やす)
    for (c を1からcolまで1ずつ増やす)
      result[r,c] ← (dataの行番号rの要素の和) × (dataの列番号cの要素の和) ÷ t
    endfor
  endfor
  return result', '[{"id":"a","text":"a=44，b=33"},{"id":"b","text":"a=58，b=8"},{"id":"c","text":"a=70，b=7"},{"id":"d","text":"a=75，b=2"},{"id":"e","text":"a=80，b=6"},{"id":"f","text":"a=80，b=8"},{"id":"g","text":"a=82，b=6"}]', '"e"', '全体154人，接種者88人，未接種者66人。非罹患者140人，罹患者14人。理論度数a＝88×140÷154＝80，b＝66×14÷154＝6。', 'official', 'https://www.ipa.go.jp/shiken/mondai-kaiotu/sg_fe/koukai/tbl5kb0000005r9r-att/2025r07_fe_kamoku_b_qs.pdf', 'ja', 'B', 'explicit');
