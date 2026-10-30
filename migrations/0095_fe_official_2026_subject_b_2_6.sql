-- Complete 2026 IPA FE Subject B published questions 2-6, original situations and full option sets.
-- Official answers: 2=カ(f), 3=ア(a), 4=エ(d), 5=イ(b), 6=ケ(i).
-- Pure INSERT OR IGNORE; preserves attempts/progress and previous FE practice.
INSERT OR IGNORE INTO questions (id, track_id, topic, difficulty, question_type, prompt, options_json, answer_json, explanation, source_type, source_reference, language, exam_section, exam_section_method) VALUES ('fe-ipa-official-2026-b-02', 'exam-fe', 'FE算法与程序设计', 'standard', 'single_choice', '【2026年度 IPA公開問題 科目B 問2】次のプログラム中の空欄に入れる正しい答えを選べ。
関数 complement は，引数として渡された 8 ビット型の値 x について，x に加算すると 00000000 になる値を返す。8 ビット型の加算は符号なし 2 進数として行い，桁あふれは無視する。∧，∨，▽ は各ビットの AND，OR，XOR を表す。

〔プログラム〕
○8ビット型: complement(8ビット型: x)
  8ビット型: y
  y ← ［空欄］
  y ← y ＋ 00000001
  return y', '[{"id":"a","text":"x ∧ 01111111"},{"id":"b","text":"x ∧ 11111111"},{"id":"c","text":"x ∨ 01111111"},{"id":"d","text":"x ∨ 11111111"},{"id":"e","text":"x ▽ 01111111"},{"id":"f","text":"x ▽ 11111111"}]', '"f"', '全ビットを XOR 11111111 で反転し，1 を加えると 2 の補数となる。x との 8 ビット加算結果は 0。', 'official', 'https://www.ipa.go.jp/shiken/mondai-kaiotu/sg_fe/koukai/rcu1hd0000012qj6-att/2026r08_fe_kamoku_b_qs.pdf', 'ja', 'B', 'explicit');
INSERT OR IGNORE INTO questions (id, track_id, topic, difficulty, question_type, prompt, options_json, answer_json, explanation, source_type, source_reference, language, exam_section, exam_section_method) VALUES ('fe-ipa-official-2026-b-03', 'exam-fe', 'FE算法与程序设计', 'standard', 'single_choice', '【2026年度 IPA公開問題 科目B 問3】次の二つの関数 func1 と func2 は，同じ引数 n に対して同じ値を返す。配列の要素番号は 1 から始まり，領域外参照はしない。プログラムの空欄を選べ。

〔プログラム〕
○整数型: func1(整数型: n)
  if (n が 2 以下)
    return 1
  endif
  return 2 × func1(n − 2) ＋ func1(n − 1)

○整数型: func2(整数型: n)
  整数型の配列: data ← {1, 1, 1}
  整数型: i
  /* n が 3 より小さいときは繰返し処理を実行しない */
  for (i を 3 から n まで 1 ずつ増やす)
    data[1] ← data[2]
    data[2] ← data[3]
    data[3] ← ［空欄］
  endfor
  return data[3]', '[{"id":"a","text":"2 × data[1] ＋ data[2]"},{"id":"b","text":"2 × data[2] ＋ data[1]"},{"id":"c","text":"2 × data[i − 1] ＋ data[i − 2]"},{"id":"d","text":"2 × data[i − 2] ＋ data[i − 1]"},{"id":"e","text":"data[3] ＋ 2 × data[1] ＋ data[2]"},{"id":"f","text":"data[3] ＋ 2 × data[2] ＋ data[1]"},{"id":"g","text":"data[3] ＋ 2 × data[i − 1] ＋ data[i − 2]"},{"id":"h","text":"data[3] ＋ 2 × data[i − 2] ＋ data[i − 1]"}]', '"a"', '代入後 data[1] は f(i−2)、data[2] は f(i−1) に対応し，2×data[1]＋data[2] が漸化式と一致する。', 'official', 'https://www.ipa.go.jp/shiken/mondai-kaiotu/sg_fe/koukai/rcu1hd0000012qj6-att/2026r08_fe_kamoku_b_qs.pdf', 'ja', 'B', 'explicit');
INSERT OR IGNORE INTO questions (id, track_id, topic, difficulty, question_type, prompt, options_json, answer_json, explanation, source_type, source_reference, language, exam_section, exam_section_method) VALUES ('fe-ipa-official-2026-b-04', 'exam-fe', 'FE算法与程序设计', 'standard', 'single_choice', '【2026年度 IPA公開問題 科目B 問4】単方向リストを配列 dataList と pointerList で表現する。dataList には値を，pointerList には次の要素の番号を格納する。1 番目が先頭，末尾の pointerList は未定義。配列の要素番号は 1 から始まる。

〔配列の初期状態〕
要素番号： 1 / 2 / 3 / 4 / 5
dataList： 10 / 30 / 20 / 40 / 未定義
pointerList：3 / 4 / 2 / 未定義 / 未定義
リンク順：1→3→2→4（値は 10→20→30→40）。

〔プログラム〕
大域: 整数型の配列: dataList ← {10, 30, 20, 40, 未定義の値}
大域: 整数型の配列: pointerList ← {3, 4, 2, 未定義の値, 未定義の値}
○整数型の配列: orderList()
  整数型: i, p ← 1
  整数型の配列: linearList ← {}
  for (i を 1 から dataList の要素数まで 1 ずつ増やす)
    linearList の末尾に dataList[p] の値を追加
    if (［a］ が未定義)
      繰返し処理を終了
    endif
    p ← ［b］
  endfor
  return linearList

空欄 a と b の組合せを選べ。', '[{"id":"a","text":"a: dataList[p]、b: i"},{"id":"b","text":"a: dataList[p]、b: pointerList[p]"},{"id":"c","text":"a: pointerList[p]、b: i"},{"id":"d","text":"a: pointerList[p]、b: pointerList[p]"}]', '"d"', '末尾は pointerList[p] が未定義となる。次の要素へ移動するには p を pointerList[p] に更新する。', 'official', 'https://www.ipa.go.jp/shiken/mondai-kaiotu/sg_fe/koukai/rcu1hd0000012qj6-att/2026r08_fe_kamoku_b_qs.pdf', 'ja', 'B', 'explicit');
INSERT OR IGNORE INTO questions (id, track_id, topic, difficulty, question_type, prompt, options_json, answer_json, explanation, source_type, source_reference, language, exam_section, exam_section_method) VALUES ('fe-ipa-official-2026-b-05', 'exam-fe', 'FE算法与程序设计', 'standard', 'single_choice', '【2026年度 IPA公開問題 科目B 問5】配列の要素番号は 1 から始まる。関数 oneHotEncoding は色名の配列を受け取り，各色の初出順に定めた One-Hot 表現の配列を返す。
例：{"Red", "Green", "Blue", "Red"} → {{1,0,0}, {0,1,0}, {0,0,1}, {1,0,0}}。

〔プログラム〕
○整数型配列の配列: oneHotEncoding(文字列型の配列: colors)
  整数型: i, j, k
  文字列型の配列: colorVector ← {}
  整数型の配列: tempVector
  整数型配列の配列: oneHotVector ← {}
  /* 名前一覧の作成 */
  for (i を 1 から colors の要素数まで 1 ずつ増やす)
    if (colorVector のどの要素にも colors[i] が格納されていない)
      colorVector の末尾に ［a］ を追加
    endif
  endfor
  /* One-Hot 表現への変換 */
  for (j を 1 から colors の要素数まで 1 ずつ増やす)
    tempVector ← {}
    for (k を 1 から colorVector の要素数まで 1 ずつ増やす)
      if (［b］)
        tempVector の末尾に 1 を追加
      else
        tempVector の末尾に 0 を追加
      endif
    endfor
    oneHotVector の末尾に tempVector を追加
  endfor
  return oneHotVector

空欄 a と b の組合せを選べ。', '[{"id":"a","text":"a: colors[i] の値、b: colors 内に colorVector[k] と同じ値が存在する"},{"id":"b","text":"a: colors[i] の値、b: colors[j] が colorVector[k] と等しい"},{"id":"c","text":"a: 未定義の値、b: colors 内に colorVector[k] と同じ値が存在する"},{"id":"d","text":"a: 未定義の値、b: colors[j] が colorVector[k] と等しい"}]', '"b"', '一覧には見つけた色名 colors[i] を追加し，One-Hot の 1 は現在の色 colors[j] と各色 colorVector[k] が一致する位置に立てる。', 'official', 'https://www.ipa.go.jp/shiken/mondai-kaiotu/sg_fe/koukai/rcu1hd0000012qj6-att/2026r08_fe_kamoku_b_qs.pdf', 'ja', 'B', 'explicit');
INSERT OR IGNORE INTO questions (id, track_id, topic, difficulty, question_type, prompt, options_json, answer_json, explanation, source_type, source_reference, language, exam_section, exam_section_method) VALUES ('fe-ipa-official-2026-b-06', 'exam-fe', 'FE信息安全', 'standard', 'single_choice', '【2026年度 IPA公開問題 科目B 問6】A 社は従業員 1,000 名の広告代理店。各部署は社内ファイルサーバを設置し，部署の運用担当者が管理する。営業部は Y サーバと顧客管理クラウド Z サービスを利用する。営業部従業員には Y サーバ上の全ファイルを編集できる一般アカウントがあり，Z サービスの一般アカウントもある。運用担当者には Y サーバと Z サービスの管理者アカウントがある。

情報セキュリティ部門はクラウドのログ管理について次のルールを定めた。
1. 取得：ログイン／ログアウトと，重要な操作・その成否を記録。
2. 項目：アカウント名，日本標準時での日時，操作内容。
3. アクセス管理：
 ・運用担当者だけがログにアクセスできること。
 ・ログをエクスポートする場合は自部署の社内ファイルサーバに保管し，運用担当者だけがアクセスできるようにすること。
 ・運用担当者は複数名とすること。
 ・運用担当者のクラウドログインは二要素認証とすること。
4. 保存期間：過去 1 年間を参照可能とすること。
5. 改ざん防止：運用担当者でもログを書込み・消去できないこと。

Z サービスの現状は以下のとおりである。
（一）空き容量が一定以下になると古いログから上書きされる。
（二）運用担当者は元々 C 主任と D 主任の 2 名だったが，D 主任退職後は C 主任 1 名だけ。
（三）Z サービスのログ日時は UTC で記録されている。
（四）Z サービスのログを毎月末にエクスポートして Y サーバに保管している。Y サーバは営業部全員が編集できる。

設問：上記のうち，ルール 3「ログのアクセス管理」に違反している項番だけを全て選べ。', '[{"id":"a","text":"（一），（二）"},{"id":"b","text":"（一），（二），（三）"},{"id":"c","text":"（一），（二），（四）"},{"id":"d","text":"（一），（三）"},{"id":"e","text":"（一），（三），（四）"},{"id":"f","text":"（一），（四）"},{"id":"g","text":"（二），（三）"},{"id":"h","text":"（二），（三），（四）"},{"id":"i","text":"（二），（四）"},{"id":"j","text":"（三），（四）"}]', '"i"', '（二）は運用担当者が複数名ではないためルール3違反。（四）は保管先Yサーバを営業部全員が編集でき，担当者限定のアクセス管理に違反。（一）は保存期間、（三）はログ項目の問題。', 'official', 'https://www.ipa.go.jp/shiken/mondai-kaiotu/sg_fe/koukai/rcu1hd0000012qj6-att/2026r08_fe_kamoku_b_qs.pdf', 'ja', 'B', 'explicit');
