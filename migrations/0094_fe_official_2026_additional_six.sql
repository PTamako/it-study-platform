-- Six complete 2026 FE A official published items, cross-checked against the official booklet and answer list.
-- Source https://www.ipa.go.jp/shiken/mondai-kaiotu/sg_fe/koukai/2026r08.html
-- Official answer key: 1=b, 7=d, 15=c, 17=b, 18=a, 20=b.
-- Text versions of the simple tables contain all original input figures.
-- Safe initial INSERT OR IGNORE: no change to existing question/attempt/progress rows.
INSERT OR IGNORE INTO questions (id, track_id, topic, difficulty, question_type, prompt, options_json, answer_json, explanation, source_type, source_reference, language, exam_section, exam_section_method) VALUES ('fe-ipa-official-2026-a-01', 'exam-fe', '確率・情報理論', 'standard', 'single_choice', '【2026年度 IPA公開問題 科目A 問1】入力されたビットに対して出力されるビットが 0 か 1 のいずれかである確率を遷移確率という。遷移確率を表にしたとき，a，b，c，d の関係はどれか。

入力＼出力：0 / 1
入力 0：a / b
入力 1：c / d', '[{"id":"a","text":"a ＋ b ＋ c ＋ d ＝ 1"},{"id":"b","text":"a ＋ b ＝ 1，c ＋ d ＝ 1"},{"id":"c","text":"a ＋ c ＝ 1，b ＋ d ＝ 1"},{"id":"d","text":"a ＋ d ＝ 1，b ＋ c ＝ 1"}]', '"b"', '入力が 0 の場合は出力 0 または 1 が必ず起きるため a+b=1。入力が 1 の場合は c+d=1。', 'official', 'https://www.ipa.go.jp/shiken/mondai-kaiotu/sg_fe/koukai/rcu1hd0000012qj6-att/2026r08_fe_kamoku_a_qs.pdf', 'ja', 'A', 'explicit');
INSERT OR IGNORE INTO questions (id, track_id, topic, difficulty, question_type, prompt, options_json, answer_json, explanation, source_type, source_reference, language, exam_section, exam_section_method) VALUES ('fe-ipa-official-2026-a-07', 'exam-fe', 'SQL・データベース', 'standard', 'single_choice', '【2026年度 IPA公開問題 科目A 問7】次の SQL 文によって定義され，値が格納されている「商品」表に対して，制約違反で実行エラーとなる SQL 文はどれか。

CREATE TABLE 商品 (商品コード CHAR(4) PRIMARY KEY, 商品名 VARCHAR(21), 仕入先コード CHAR(4), 仕入単価 INT, 在庫数 INT)

商品コード / 商品名 / 仕入先コード / 仕入単価 / 在庫数
A111 / テレビ / S001 / 75000 / 0
A222 / デジタルカメラ / S002 / 50000 / 50
A333 / DVDプレーヤ / NULL / NULL / NULL
A444 / 洗濯機 / S004 / 45000 / 20', '[{"id":"a","text":"DELETE FROM 商品 WHERE 仕入先コード IS NULL"},{"id":"b","text":"INSERT INTO 商品 VALUES (''A555'', ''空気清浄機'', ''S005'', 60000, 50)"},{"id":"c","text":"UPDATE 商品 SET 商品コード = ''A666'' WHERE 商品コード = ''A444''"},{"id":"d","text":"UPDATE 商品 SET 商品コード = ''A777'' WHERE 在庫数 >= 20"}]', '"d"', '在庫数が20以上の A222 と A444 の商品コードを両方 A777 に書き換えると PRIMARY KEY の一意性制約に違反する。', 'official', 'https://www.ipa.go.jp/shiken/mondai-kaiotu/sg_fe/koukai/rcu1hd0000012qj6-att/2026r08_fe_kamoku_a_qs.pdf', 'ja', 'A', 'explicit');
INSERT OR IGNORE INTO questions (id, track_id, topic, difficulty, question_type, prompt, options_json, answer_json, explanation, source_type, source_reference, language, exam_section, exam_section_method) VALUES ('fe-ipa-official-2026-a-15', 'exam-fe', 'システム監査', 'standard', 'single_choice', '【2026年度 IPA公開問題 科目A 問15】内部監査部門が，情報システム部門に対するシステム監査を経営者から指示されたとき，システム監査人の行為として，適切なものはどれか。', '[{"id":"a","text":"監査報告書に記載した改善提案に対して改善計画を策定した上で，実行する。"},{"id":"b","text":"基幹システムを開発し，保守を行っている外部事業者に，当該システム監査を委託する。"},{"id":"c","text":"経営者がどのようなニーズを有しているかを十分に把握した上で，システム監査の目的と対象範囲を決定する。"},{"id":"d","text":"情報システム部門の在籍者を監査メンバとして選定する。"}]', '"c"', '監査人は独立性を保ちつつ経営者のニーズを把握して目的と範囲を決める。改善計画の実施は被監査側の役割。', 'official', 'https://www.ipa.go.jp/shiken/mondai-kaiotu/sg_fe/koukai/rcu1hd0000012qj6-att/2026r08_fe_kamoku_a_qs.pdf', 'ja', 'A', 'explicit');
INSERT OR IGNORE INTO questions (id, track_id, topic, difficulty, question_type, prompt, options_json, answer_json, explanation, source_type, source_reference, language, exam_section, exam_section_method) VALUES ('fe-ipa-official-2026-a-17', 'exam-fe', 'データ分析・マーケティング', 'standard', 'single_choice', '【2026年度 IPA公開問題 科目A 問17】サービス A～D の中で会員のリテンション率が最も高いものはどれか。リテンションの対象は前月末から当月末まで継続して在籍した会員とし，当月新規会員は月末までの退会はない。

サービス / 前月末会員数 / 当月新規会員数 / 当月末会員数
A / 1000 / 500 / 800
B / 1000 / 200 / 800
C / 1500 / 500 / 1100
D / 1500 / 1000 / 1800', '[{"id":"a","text":"サービス A"},{"id":"b","text":"サービス B"},{"id":"c","text":"サービス C"},{"id":"d","text":"サービス D"}]', '"b"', 'リテンション率=(当月末会員数−当月新規会員数)÷前月末会員数。A=30%、B=60%、C=40%、D≈53.3%で B が最大。', 'official', 'https://www.ipa.go.jp/shiken/mondai-kaiotu/sg_fe/koukai/rcu1hd0000012qj6-att/2026r08_fe_kamoku_a_qs.pdf', 'ja', 'A', 'explicit');
INSERT OR IGNORE INTO questions (id, track_id, topic, difficulty, question_type, prompt, options_json, answer_json, explanation, source_type, source_reference, language, exam_section, exam_section_method) VALUES ('fe-ipa-official-2026-a-18', 'exam-fe', 'AI・機械学習', 'standard', 'single_choice', '【2026年度 IPA公開問題 科目A 問18】AI の事例として，適切でないものはどれか。', '[{"id":"a","text":"制御量を目標値側へフィードバックすることによって両者を比較し，その差によって両者を一致させるような修正動作を行う PID 制御のモーターコントローラー"},{"id":"b","text":"部屋の広さや形，家具の位置などを学習し，移動のルートを決めて掃除をするロボット"},{"id":"c","text":"ヘルプデスク及びコールセンターに代わって，自然言語による質問の意味を推測して返事をするチャットボット"},{"id":"d","text":"ボードゲームでプロの人間に勝つような，多数の統計データを処理することによって人間に勝るソフトウェア"}]', '"a"', 'PID制御は一定の制御則によるフィードバック制御であり，学習や推論を伴うAIの事例ではない。', 'official', 'https://www.ipa.go.jp/shiken/mondai-kaiotu/sg_fe/koukai/rcu1hd0000012qj6-att/2026r08_fe_kamoku_a_qs.pdf', 'ja', 'A', 'explicit');
INSERT OR IGNORE INTO questions (id, track_id, topic, difficulty, question_type, prompt, options_json, answer_json, explanation, source_type, source_reference, language, exam_section, exam_section_method) VALUES ('fe-ipa-official-2026-a-20', 'exam-fe', '知的財産権', 'standard', 'single_choice', '【2026年度 IPA公開問題 科目A 問20】A 社は，自社の業務可視化を B 社に委託しその成果物として納品された業務フロー図を C 社に提示することによって，業務システムの開発を C 社に委託することを検討している。A 社がこの業務フロー図を使用する上で生じる制約として，適切なものはどれか。

B 社への委託に当たって締結された契約には，著作権は全て A 社に譲渡する旨の記述があり，著作者人格権については特段の記述はない。', '[{"id":"a","text":"C 社と守秘義務契約を締結したとしても，C 社に対して，納品された業務フロー図の電子データを提供することはできない。"},{"id":"b","text":"納品された業務フロー図の各ページに作成者名として記されている B 社の企業名を A 社の企業名に変更し，C 社に提示することはできない。"},{"id":"c","text":"納品された業務フロー図を印刷し，社内資料として A 社の社員に配布することはできない。"},{"id":"d","text":"バックアップの目的で，納品された業務フロー図の電子データを複製し，A 社だけがアクセス可能なクラウドストレージに保管することはできない。"}]', '"b"', '著作権の譲渡があっても著作者人格権は譲渡できない。氏名表示の変更には著作者人格権の配慮が必要。', 'official', 'https://www.ipa.go.jp/shiken/mondai-kaiotu/sg_fe/koukai/rcu1hd0000012qj6-att/2026r08_fe_kamoku_a_qs.pdf', 'ja', 'A', 'explicit');
