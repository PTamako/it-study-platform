-- Eight IPA published FE A problems that previously required diagram/figure support.
-- All answers checked against original official 2023-2026 answer PDFs.
-- Complex diagrams described as graph edges, truth tables or stage signal logic; official PDF link provided.
-- 2026 A6 timing charts remain image-specific; open source PDF for exact four choices.
-- INSERT OR IGNORE, no changes to existing user submissions/progress.
INSERT OR IGNORE INTO questions (id, track_id, topic, difficulty, question_type, prompt, options_json, answer_json, explanation, source_type, source_reference, language, exam_section, exam_section_method) VALUES ('fe-ipa-official-2023-a-10', 'exam-fe', '情報セキュリティ・WAF', 'standard', 'single_choice', '【2023年度 IPA公開問題 科目A 問10】HTTPSでPCからWebサーバに接続するシステムで，復号・暗号化機能をもたないWAFの設置場所として最も適切なものはどれか。

〔図：通信の接続順（IPA原図の等価テキスト）〕
PC → Internet → [a] → Firewall → [b] → SSLアクセラレータ → [c] → Webサーバ → [d] → DBサーバ
・PC～SSLアクセラレータはHTTPS
・SSLアクセラレータ～WebサーバはHTTP（復号済み）
・Webサーバ～DBサーバはデータベースアクセス用サービス
※IPA原卷のネットワーク構成図は上部「IPA 官方原卷」から確認できる。', '[{"id":"a","text":"a"},{"id":"b","text":"b"},{"id":"c","text":"c"},{"id":"d","text":"d"}]', '"c"', 'WAFはWebアプリケーション向けHTTPの中身を検査する。復号機能がないため，SSLアクセラレータでHTTPSを復号した後・Webサーバの前のcが適切。', 'official', 'https://www.ipa.go.jp/shiken/mondai-kaiotu/sg_fe/koukai/t6hhco0000003zx0-att/2023r05_fe_kamoku_a_qs.pdf', 'ja', 'A', 'explicit');
INSERT OR IGNORE INTO questions (id, track_id, topic, difficulty, question_type, prompt, options_json, answer_json, explanation, source_type, source_reference, language, exam_section, exam_section_method) VALUES ('fe-ipa-official-2023-a-11', 'exam-fe', 'アルゴリズム・フローチャート', 'standard', 'single_choice', '【2023年度 IPA公開問題 科目A 問11】次の流れ図で実行順を ①→②→③→⑤→②→③→④→②→⑥ とするため，初期値a,bの関係として正しいものはどれか。a,bは正の整数。

〔流れ図の処理〕
① m←a, n←b
② mとnを比較：等しいなら⑥，異なるなら③
③ mとnを比較：m<nなら⑤，m>nなら④
④ m←m−n，②へ戻る
⑤ n←n−m，②へ戻る
⑥ mを出力し終了

※公式の分岐図は原卷に掲載。', '[{"id":"a","text":"a＝2b"},{"id":"b","text":"2a＝b"},{"id":"c","text":"2a＝3b"},{"id":"d","text":"3a＝2b"}]', '"d"', '初回③でm<nだからa<b。⑤後にn=b−aがaより小さく，④でm=a−(b−a)=2a−b。②で等しいには2a−b=b−a，すなわち3a=2b。', 'official', 'https://www.ipa.go.jp/shiken/mondai-kaiotu/sg_fe/koukai/t6hhco0000003zx0-att/2023r05_fe_kamoku_a_qs.pdf', 'ja', 'A', 'explicit');
INSERT OR IGNORE INTO questions (id, track_id, topic, difficulty, question_type, prompt, options_json, answer_json, explanation, source_type, source_reference, language, exam_section, exam_section_method) VALUES ('fe-ipa-official-2023-a-13', 'exam-fe', 'プロジェクト管理・クリティカルパス', 'standard', 'single_choice', '【2023年度 IPA公開問題 科目A 問13】次のアローダイアグラムの作業Aで1日の遅れが発生した。最少の追加費用で元の完成日数を守るため短縮すべき作業はどれか。

〔図のネットワーク・等価テキスト〕
開始→A(4日)→分岐点
  分岐点→B(6日)→E(5日)→合流点
  分岐点→C(8日)→合流点
  分岐点→D(4日)→F(4日)→合流点
合流点→G(5日)→終了

〔1日短縮する場合の増加費用〕
A:4，B:6，C:3，D:2，E:2.5，F:2.5，G:5
（図と費用の表はIPA公式原卷で確認可能）', '[{"id":"a","text":"B"},{"id":"b","text":"C"},{"id":"c","text":"D"},{"id":"d","text":"E"}]', '"d"', '最長経路はA→B→E→Gで20日。Aが1日遅れたので，この最長経路の短縮が必要。候補Bは6，Eは2.5の追加費用なのでEを選ぶ。', 'official', 'https://www.ipa.go.jp/shiken/mondai-kaiotu/sg_fe/koukai/t6hhco0000003zx0-att/2023r05_fe_kamoku_a_qs.pdf', 'ja', 'A', 'explicit');
INSERT OR IGNORE INTO questions (id, track_id, topic, difficulty, question_type, prompt, options_json, answer_json, explanation, source_type, source_reference, language, exam_section, exam_section_method) VALUES ('fe-ipa-official-2024-a-03', 'exam-fe', 'コンピュータ構成・キャッシュ', 'standard', 'single_choice', '【2024年度 IPA公開問題 科目A 問3】キャッシュと主記憶の構成は同じで，アクセス時間だけ異なるCPU XとCPU Yを使用したところ，実行時間が等しかった。キャッシュのヒット率はいくらか。CPU以外の影響はない。

〔図・表〕
CPU内に256kBのキャッシュメモリ，外部に256MBの主記憶。
キャッシュアクセス：X=40ns，Y=20ns
主記憶アクセス：X=400ns，Y=580ns

アクセス時間はヒット率hで加重平均する。', '[{"id":"a","text":"0.75"},{"id":"b","text":"0.90"},{"id":"c","text":"0.95"},{"id":"d","text":"0.96"}]', '"b"', '40h＋400(1−h)＝20h＋580(1−h)。整理すると200h＝180なのでh＝0.90。', 'official', 'https://www.ipa.go.jp/shiken/mondai-kaiotu/sg_fe/koukai/eid2eo0000007g1d-att/2024r06_fe_kamoku_a_qs.pdf', 'ja', 'A', 'explicit');
INSERT OR IGNORE INTO questions (id, track_id, topic, difficulty, question_type, prompt, options_json, answer_json, explanation, source_type, source_reference, language, exam_section, exam_section_method) VALUES ('fe-ipa-official-2024-a-13', 'exam-fe', 'プロジェクト管理・アローダイアグラム', 'standard', 'single_choice', '【2024年度 IPA公開問題 科目A 問13】図のプロジェクトは完了まで最少で何日か。次の矢印は作業と所要日数を表す。

〔アローダイアグラム：等価テキスト〕
開始→A(30日)→分岐点P
P→B(5日)→Q
P→C(30日)→R
P→D(20日)→S
Q→R（ダミー0日）
R→S（ダミー0日）
Q→E(40日)→T
R→F(25日)→T
S→G(30日)→T
T→H(30日)→終了
※ネットワークの原図は上部の公式原卷で確認できる。', '[{"id":"a","text":"105"},{"id":"b","text":"115"},{"id":"c","text":"120"},{"id":"d","text":"125"}]', '"c"', '最長経路はA30→C30→ダミー→G30→H30の120日であり，これが全体所要日数を決める。', 'official', 'https://www.ipa.go.jp/shiken/mondai-kaiotu/sg_fe/koukai/eid2eo0000007g1d-att/2024r06_fe_kamoku_a_qs.pdf', 'ja', 'A', 'explicit');
INSERT OR IGNORE INTO questions (id, track_id, topic, difficulty, question_type, prompt, options_json, answer_json, explanation, source_type, source_reference, language, exam_section, exam_section_method) VALUES ('fe-ipa-official-2024-a-19', 'exam-fe', '統計・相関', 'standard', 'single_choice', '【2024年度 IPA公開問題 科目A 問19】製品の製造要因の値xと品質特性の値yをプロットした散布図から読み取れることはどれか。

〔散布図の説明〕
横軸x，縦軸y。点群は左上から右下へ分布し，xが増加するほどyが減る傾向が見える（負の相関）。単純な単調減少の点群であり，二次曲線を必要とする形状ではない。
※点群の原図はIPA公式原卷を確認。', '[{"id":"a","text":"xからyを推定するためには，2次回帰係数の計算が必要である。"},{"id":"b","text":"xからyを推定する回帰式は，yからxを推定する回帰式と同じである。"},{"id":"c","text":"xとyの相関係数は正である。"},{"id":"d","text":"xとyの相関係数は負である。"}]', '"d"', '散布点が右下がりなので，xとyは負の相関にある。正の相関や二次回帰を断定できない。', 'official', 'https://www.ipa.go.jp/shiken/mondai-kaiotu/sg_fe/koukai/eid2eo0000007g1d-att/2024r06_fe_kamoku_a_qs.pdf', 'ja', 'A', 'explicit');
INSERT OR IGNORE INTO questions (id, track_id, topic, difficulty, question_type, prompt, options_json, answer_json, explanation, source_type, source_reference, language, exam_section, exam_section_method) VALUES ('fe-ipa-official-2025-a-14', 'exam-fe', 'プロジェクト管理・アローダイアグラム', 'standard', 'single_choice', '【2025年度 IPA公開問題 科目A 問14】図の作業A～Iと各日数から，プロジェクトの最短所要日数を求めよ。

〔アローダイアグラム：等価テキスト〕
開始→A(3日)→P
P→B(6日)→Q
P→E(5日)→R
R→Q（ダミー0日）
P→F(14日)→S
Q→G(11日)→T
T→S（ダミー0日）
Q→C(8日)→S
S→D(6日)→U
Q→H(15日)→U
U→I(5日)→終了
※原図もIPA原卷に掲載。', '[{"id":"a","text":"27"},{"id":"b","text":"28"},{"id":"c","text":"29"},{"id":"d","text":"31"}]', '"d"', 'A(3)＋B(6)＋G(11)＋D(6)＋I(5)＝31日が最長経路となる。', 'official', 'https://www.ipa.go.jp/shiken/mondai-kaiotu/sg_fe/koukai/tbl5kb0000005r9r-att/2025r07_fe_kamoku_a_qs.pdf', 'ja', 'A', 'explicit');
INSERT OR IGNORE INTO questions (id, track_id, topic, difficulty, question_type, prompt, options_json, answer_json, explanation, source_type, source_reference, language, exam_section, exam_section_method) VALUES ('fe-ipa-official-2026-a-06', 'exam-fe', '論理回路・タイミングチャート', 'standard', 'single_choice', '【2026年度 IPA公開問題 科目A 問6】AとBを回路に入力したとき，Yのタイミングチャートとして正しいものを選べ。

〔論理回路の等価表現〕
AをNAND(A,A)に入力しNOT Aを生成。
BをNAND(B,B)に入力しNOT Bを生成。
この二つをNANDで接続し，その結果をさらにNAND(X,X)に入力してYを生成。
したがって Y＝NOT(A OR B)，いわゆるNOR。
※重要：選択肢ア・イ・ウ・エはそれぞれA／B／Yの独立した波形図。各図の正確な時間位置は上部「IPA 官方原卷」から確認すること。', '[{"id":"a","text":"ア：公式PDFの波形図ア"},{"id":"b","text":"イ：公式PDFの波形図イ"},{"id":"c","text":"ウ：公式PDFの波形図ウ"},{"id":"d","text":"エ：公式PDFの波形図エ"}]', '"b"', '1段目はそれぞれNOT A，NOT B，2段目NANDでA OR B，最終NANDでNOT(A OR B)。AとBの双方が0のときだけYが1になる波形はイ。', 'official', 'https://www.ipa.go.jp/shiken/mondai-kaiotu/sg_fe/koukai/rcu1hd0000012qj6-att/2026r08_fe_kamoku_a_qs.pdf', 'ja', 'A', 'explicit');
