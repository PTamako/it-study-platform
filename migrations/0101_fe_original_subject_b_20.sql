-- Twenty independently authored current FE B practice questions: 16 algorithm + 4 security.
-- These are original exercises and MUST NOT be presented as IPA official past questions.
-- Stable primary keys and INSERT OR IGNORE protect review history and repeated migrations.
INSERT OR IGNORE INTO questions (id, track_id, topic, difficulty, question_type, prompt, options_json, answer_json, explanation, source_type, source_reference, language, exam_section, exam_section_method) VALUES ('fe-original-v2-b-001', 'exam-fe', 'FE算法与程序设计', 'standard', 'single_choice', '【知学オリジナル・科目B 演習1】次の手順の結果は何か。

sum ← 0
for i を 1 から 10 まで増やす
  if (i mod 2 = 0) なら sum ← sum + i
endfor
return sum', '[{"id":"a","text":"20"},{"id":"b","text":"25"},{"id":"c","text":"30"},{"id":"d","text":"55"}]', '"c"', '2＋4＋6＋8＋10＝30。偶数だけを合計する。', 'generated', '知学オリジナル練習問題（IPA公式過去問ではありません）', 'ja', 'B', 'explicit');
INSERT OR IGNORE INTO questions (id, track_id, topic, difficulty, question_type, prompt, options_json, answer_json, explanation, source_type, source_reference, language, exam_section, exam_section_method) VALUES ('fe-original-v2-b-002', 'exam-fe', 'FE算法与程序设计', 'standard', 'single_choice', '【知学オリジナル・科目B 演習2】昇順配列 {3,6,9,12,15,18,21} に対し二分探索で 15 を探す。
low←1, high←7，mid←floor((low+high)/2) として比較を繰り返す。
探索成功までに配列要素と 15 を比較する回数は何回か。', '[{"id":"a","text":"2回"},{"id":"b","text":"3回"},{"id":"c","text":"4回"},{"id":"d","text":"5回"}]', '"b"', 'mid=4（12）、mid=6（18）、mid=5（15）の順で3回比較する。', 'generated', '知学オリジナル練習問題（IPA公式過去問ではありません）', 'ja', 'B', 'explicit');
INSERT OR IGNORE INTO questions (id, track_id, topic, difficulty, question_type, prompt, options_json, answer_json, explanation, source_type, source_reference, language, exam_section, exam_section_method) VALUES ('fe-original-v2-b-003', 'exam-fe', 'FE算法与程序设计', 'standard', 'single_choice', '【知学オリジナル・科目B 演習3】配列 {5,2,4} を選択ソートで昇順にする。各回，未整列部分の最小要素と先頭要素を交換する。
値が異なる要素同士を交換する回数は何回か。', '[{"id":"a","text":"1回"},{"id":"b","text":"2回"},{"id":"c","text":"3回"},{"id":"d","text":"4回"}]', '"b"', '初回に5と2を交換し{2,5,4}、次回に5と4を交換し{2,4,5}。計2回。', 'generated', '知学オリジナル練習問題（IPA公式過去問ではありません）', 'ja', 'B', 'explicit');
INSERT OR IGNORE INTO questions (id, track_id, topic, difficulty, question_type, prompt, options_json, answer_json, explanation, source_type, source_reference, language, exam_section, exam_section_method) VALUES ('fe-original-v2-b-004', 'exam-fe', 'FE算法与程序设计', 'standard', 'single_choice', '【知学オリジナル・科目B 演習4】次の関数の戻り値はいくつか。

○整数型: f(整数型: n)
  if (n ≦ 1) return 1
  return n × f(n−1)

f(4) を呼び出す。', '[{"id":"a","text":"6"},{"id":"b","text":"12"},{"id":"c","text":"24"},{"id":"d","text":"30"}]', '"c"', '4×3×2×1=24。再帰呼出しはn=1で停止する。', 'generated', '知学オリジナル練習問題（IPA公式過去問ではありません）', 'ja', 'B', 'explicit');
INSERT OR IGNORE INTO questions (id, track_id, topic, difficulty, question_type, prompt, options_json, answer_json, explanation, source_type, source_reference, language, exam_section, exam_section_method) VALUES ('fe-original-v2-b-005', 'exam-fe', 'FE算法与程序设计', 'standard', 'single_choice', '【知学オリジナル・科目B 演習5】次の再帰関数 f(6) の値はどれか。

f(1)=1，f(2)=1
n≧3 のとき f(n)=f(n−1)+f(n−2)', '[{"id":"a","text":"5"},{"id":"b","text":"7"},{"id":"c","text":"8"},{"id":"d","text":"13"}]', '"c"', '数列は1,1,2,3,5,8となる。', 'generated', '知学オリジナル練習問題（IPA公式過去問ではありません）', 'ja', 'B', 'explicit');
INSERT OR IGNORE INTO questions (id, track_id, topic, difficulty, question_type, prompt, options_json, answer_json, explanation, source_type, source_reference, language, exam_section, exam_section_method) VALUES ('fe-original-v2-b-006', 'exam-fe', 'FE算法与程序设计', 'standard', 'single_choice', '【知学オリジナル・科目B 演習6】空のスタックに次の操作を順番に実行する。
push(3), push(8), pop(), push(5), pop()
最後の pop() が返す値はどれか。', '[{"id":"a","text":"3"},{"id":"b","text":"5"},{"id":"c","text":"8"},{"id":"d","text":"未定義"}]', '"b"', '8を取り出した後，スタックには3だけ残る。5を積むので最後のpopは5。', 'generated', '知学オリジナル練習問題（IPA公式過去問ではありません）', 'ja', 'B', 'explicit');
INSERT OR IGNORE INTO questions (id, track_id, topic, difficulty, question_type, prompt, options_json, answer_json, explanation, source_type, source_reference, language, exam_section, exam_section_method) VALUES ('fe-original-v2-b-007', 'exam-fe', 'FE算法与程序设计', 'standard', 'single_choice', '【知学オリジナル・科目B 演習7】空のキューに enqueue(4), enqueue(7), dequeue(), enqueue(9), dequeue() を順番に実行する。
最後の dequeue() は何を返すか。', '[{"id":"a","text":"4"},{"id":"b","text":"7"},{"id":"c","text":"9"},{"id":"d","text":"未定義"}]', '"b"', 'FIFOなので最初に4を取り出し，次の先頭は7。', 'generated', '知学オリジナル練習問題（IPA公式過去問ではありません）', 'ja', 'B', 'explicit');
INSERT OR IGNORE INTO questions (id, track_id, topic, difficulty, question_type, prompt, options_json, answer_json, explanation, source_type, source_reference, language, exam_section, exam_section_method) VALUES ('fe-original-v2-b-008', 'exam-fe', 'FE算法与程序设计', 'standard', 'single_choice', '【知学オリジナル・科目B 演習8】大きさ7のハッシュ表を使い，格納位置を key mod 7 で求める。衝突時は次の位置へ線形探索し，空き場所に入れる。
キー10,17,24を順に挿入したとき，24は添字0～6のどこへ入るか。', '[{"id":"a","text":"3"},{"id":"b","text":"4"},{"id":"c","text":"5"},{"id":"d","text":"6"}]', '"c"', '3つとも余り3。10は3、17は4、24は5に入る。', 'generated', '知学オリジナル練習問題（IPA公式過去問ではありません）', 'ja', 'B', 'explicit');
INSERT OR IGNORE INTO questions (id, track_id, topic, difficulty, question_type, prompt, options_json, answer_json, explanation, source_type, source_reference, language, exam_section, exam_section_method) VALUES ('fe-original-v2-b-009', 'exam-fe', 'FE算法与程序设计', 'standard', 'single_choice', '【知学オリジナル・科目B 演習9】グラフの頂点Aの隣接頂点はB,C，Bの隣接頂点はD，Cの隣接頂点はEとする。隣接順B→C，D→Eで幅優先探索する。
最初の5頂点の訪問順として正しいものはどれか。', '[{"id":"a","text":"A,B,D,C,E"},{"id":"b","text":"A,B,C,D,E"},{"id":"c","text":"A,C,E,B,D"},{"id":"d","text":"A,D,B,C,E"}]', '"b"', '幅優先探索は同じ深さの頂点を先に訪問する。A→B,C→D,E。', 'generated', '知学オリジナル練習問題（IPA公式過去問ではありません）', 'ja', 'B', 'explicit');
INSERT OR IGNORE INTO questions (id, track_id, topic, difficulty, question_type, prompt, options_json, answer_json, explanation, source_type, source_reference, language, exam_section, exam_section_method) VALUES ('fe-original-v2-b-010', 'exam-fe', 'FE算法与程序设计', 'standard', 'single_choice', '【知学オリジナル・科目B 演習10】二分探索木の根は5，左の子3（子は2と4），右の子8とする。
中順巡回（左→根→右）の結果はどれか。', '[{"id":"a","text":"5,3,2,4,8"},{"id":"b","text":"2,3,4,5,8"},{"id":"c","text":"2,4,3,8,5"},{"id":"d","text":"8,5,4,3,2"}]', '"b"', '左部分木を2,3,4，次に根5，右8を訪問する。', 'generated', '知学オリジナル練習問題（IPA公式過去問ではありません）', 'ja', 'B', 'explicit');
INSERT OR IGNORE INTO questions (id, track_id, topic, difficulty, question_type, prompt, options_json, answer_json, explanation, source_type, source_reference, language, exam_section, exam_section_method) VALUES ('fe-original-v2-b-011', 'exam-fe', 'FE算法与程序设计', 'standard', 'single_choice', '【知学オリジナル・科目B 演習11】1円玉と2円玉を何枚でも使って5円を支払う。硬貨の順序を区別しない場合，組合せの数は幾つか。', '[{"id":"a","text":"2"},{"id":"b","text":"3"},{"id":"c","text":"4"},{"id":"d","text":"6"}]', '"b"', '2円玉を0,1,2枚使う3通り。各ケースで残額は1円玉で一意に支払える。', 'generated', '知学オリジナル練習問題（IPA公式過去問ではありません）', 'ja', 'B', 'explicit');
INSERT OR IGNORE INTO questions (id, track_id, topic, difficulty, question_type, prompt, options_json, answer_json, explanation, source_type, source_reference, language, exam_section, exam_section_method) VALUES ('fe-original-v2-b-012', 'exam-fe', 'FE算法与程序设计', 'standard', 'single_choice', '【知学オリジナル・科目B 演習12】次の二重ループで cnt←cnt+1 が実行される総回数のオーダーはどれか。

for i を 1 から n まで
  for j を 1 から i まで
    cnt ← cnt+1
  endfor
endfor', '[{"id":"a","text":"O(1)"},{"id":"b","text":"O(log n)"},{"id":"c","text":"O(n)"},{"id":"d","text":"O(n²)"}]', '"d"', '実行回数は1+2+...+n=n(n+1)/2で，二次のオーダー。', 'generated', '知学オリジナル練習問題（IPA公式過去問ではありません）', 'ja', 'B', 'explicit');
INSERT OR IGNORE INTO questions (id, track_id, topic, difficulty, question_type, prompt, options_json, answer_json, explanation, source_type, source_reference, language, exam_section, exam_section_method) VALUES ('fe-original-v2-b-013', 'exam-fe', 'FE算法与程序设计', 'standard', 'single_choice', '【知学オリジナル・科目B 演習13】8ビットの値 10101100 と 00001111 のビットごとの XOR の結果はどれか。', '[{"id":"a","text":"10100011"},{"id":"b","text":"10101111"},{"id":"c","text":"00001100"},{"id":"d","text":"11111111"}]', '"a"', 'XORは異なるビットだけ1。下位4ビット1100 XOR 1111 =0011。', 'generated', '知学オリジナル練習問題（IPA公式過去問ではありません）', 'ja', 'B', 'explicit');
INSERT OR IGNORE INTO questions (id, track_id, topic, difficulty, question_type, prompt, options_json, answer_json, explanation, source_type, source_reference, language, exam_section, exam_section_method) VALUES ('fe-original-v2-b-014', 'exam-fe', 'FE算法与程序设计', 'standard', 'single_choice', '【知学オリジナル・科目B 演習14】文字列 "ababa" の中に "aba" が現れる開始位置は幾つあるか。
文字の位置は1から始まり，重なって現れる場合も数える。', '[{"id":"a","text":"1"},{"id":"b","text":"2"},{"id":"c","text":"3"},{"id":"d","text":"4"}]', '"b"', '位置1～3と位置3～5の2回。重なりを許して数える。', 'generated', '知学オリジナル練習問題（IPA公式過去問ではありません）', 'ja', 'B', 'explicit');
INSERT OR IGNORE INTO questions (id, track_id, topic, difficulty, question_type, prompt, options_json, answer_json, explanation, source_type, source_reference, language, exam_section, exam_section_method) VALUES ('fe-original-v2-b-015', 'exam-fe', 'FE算法与程序设计', 'standard', 'single_choice', '【知学オリジナル・科目B 演習15】昇順配列 {1,4,6,10} から和が11となる2要素を選ぶ。左右のポインタを両端に置き，和が大きければ右を，小さければ左を動かす。
最初に発見される組合せはどれか。', '[{"id":"a","text":"1と10"},{"id":"b","text":"4と6"},{"id":"c","text":"1と6"},{"id":"d","text":"4と10"}]', '"a"', '両端の1と10の和が最初から11なので直ちに見つかる。', 'generated', '知学オリジナル練習問題（IPA公式過去問ではありません）', 'ja', 'B', 'explicit');
INSERT OR IGNORE INTO questions (id, track_id, topic, difficulty, question_type, prompt, options_json, answer_json, explanation, source_type, source_reference, language, exam_section, exam_section_method) VALUES ('fe-original-v2-b-016', 'exam-fe', 'FE算法与程序设计', 'standard', 'single_choice', '【知学オリジナル・科目B 演習16】次のプログラムの出力は何か。

value ← 0
for x in {2,3,4,5,6}
  if (x mod 2 = 0)
    value ← value + x
  endif
endfor
表示(value)', '[{"id":"a","text":"10"},{"id":"b","text":"11"},{"id":"c","text":"12"},{"id":"d","text":"20"}]', '"c"', '偶数の2,4,6のみ加算され，合計は12。', 'generated', '知学オリジナル練習問題（IPA公式過去問ではありません）', 'ja', 'B', 'explicit');
INSERT OR IGNORE INTO questions (id, track_id, topic, difficulty, question_type, prompt, options_json, answer_json, explanation, source_type, source_reference, language, exam_section, exam_section_method) VALUES ('fe-original-v2-b-017', 'exam-fe', 'FE信息安全', 'standard', 'single_choice', '【知学オリジナル・科目B 演習17】社内システムのログをクラウドに保管する。管理者が誤っても過去ログを削除・改変できないようにする対策として最も適切なものはどれか。', '[{"id":"a","text":"同じ管理者にすべての削除権限を付与する"},{"id":"b","text":"変更不能な保持期間を設定するWORM／オブジェクトロック機能を利用する"},{"id":"c","text":"ログの取得を停止する"},{"id":"d","text":"過去ログを毎日上書きする"}]', '"b"', 'オブジェクトロック等の保持ポリシーによって保存期間内の変更や削除を防ぐ。', 'generated', '知学オリジナル練習問題（IPA公式過去問ではありません）', 'ja', 'B', 'explicit');
INSERT OR IGNORE INTO questions (id, track_id, topic, difficulty, question_type, prompt, options_json, answer_json, explanation, source_type, source_reference, language, exam_section, exam_section_method) VALUES ('fe-original-v2-b-018', 'exam-fe', 'FE信息安全', 'standard', 'single_choice', '【知学オリジナル・科目B 演習18】機密情報を扱う共有フォルダのアクセス権を設計する。最小権限の原則に最も適うのはどれか。', '[{"id":"a","text":"全社員に書込み権限を付与する"},{"id":"b","text":"必要な担当者に必要な期間だけ必要な権限を付与し，定期的に見直す"},{"id":"c","text":"管理が容易になるよう匿名アクセスを常時有効にする"},{"id":"d","text":"退職者の権限を残しておく"}]', '"b"', '必要最小限の範囲・期間で権限を付与し，継続的にレビューする。', 'generated', '知学オリジナル練習問題（IPA公式過去問ではありません）', 'ja', 'B', 'explicit');
INSERT OR IGNORE INTO questions (id, track_id, topic, difficulty, question_type, prompt, options_json, answer_json, explanation, source_type, source_reference, language, exam_section, exam_section_method) VALUES ('fe-original-v2-b-019', 'exam-fe', 'FE信息安全', 'standard', 'single_choice', '【知学オリジナル・科目B 演習19】重要な業務端末でマルウェア感染が疑われ，外部への不審通信を検知した。初動対応として最も適切なのはどれか。', '[{"id":"a","text":"調査せず全ログを削除する"},{"id":"b","text":"感染疑い端末を適切にネットワークから隔離し，証拠と時系列を記録して対応チームに連絡する"},{"id":"c","text":"社内全体に未検証の感染源を断定して通知する"},{"id":"d","text":"不審通信を継続して端末を放置する"}]', '"b"', '被害拡大を抑える隔離と，証拠保全・報告を並行して実施する。', 'generated', '知学オリジナル練習問題（IPA公式過去問ではありません）', 'ja', 'B', 'explicit');
INSERT OR IGNORE INTO questions (id, track_id, topic, difficulty, question_type, prompt, options_json, answer_json, explanation, source_type, source_reference, language, exam_section, exam_section_method) VALUES ('fe-original-v2-b-020', 'exam-fe', 'FE信息安全', 'standard', 'single_choice', '【知学オリジナル・科目B 演習20】バックアップの3-2-1ルールの説明として最も適切なものはどれか。', '[{"id":"a","text":"コピー3つ，異なる媒体2種類，うち1つは別の場所に保管する"},{"id":"b","text":"コピー3つを必ず同じディスクに保存する"},{"id":"c","text":"2時間ごとに1回だけバックアップする"},{"id":"d","text":"必ず3つの管理者アカウントを使用する"}]', '"a"', '3つのコピー（原本を含む），2種類の媒体，1つのオフサイト保管という考え方。', 'generated', '知学オリジナル練習問題（IPA公式過去問ではありません）', 'ja', 'B', 'explicit');
