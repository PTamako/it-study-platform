-- Complete published IPA FE security-case questions 2023/2024/2025 Subject B Q6.
-- Source scenario, risk control facts and all answer choices are preserved in mobile-readable layout.
-- Answers checked against official IPA B answer keys: 2023 ア, 2024 ウ, 2025 ク.
-- INSERT OR IGNORE; never deletes or changes saved learning history.
INSERT OR IGNORE INTO questions (id, track_id, topic, difficulty, question_type, prompt, options_json, answer_json, explanation, source_type, source_reference, language, exam_section, exam_section_method) VALUES ('fe-ipa-official-2023-b-06', 'exam-fe', 'FE信息安全', 'standard', 'single_choice', '【2023年度 IPA公開問題 科目B 問6】A社は放送会社・運輸会社向け広告制作会社で，人事業務の効率化のため入社時の誓約書や前職の源泉徴収票をPDF化してファイルサーバに格納する業務（B業務）の委託を検討している。

〔図1 B業務〕
採用予定者から郵送される機密書類をPDF化し，ファイルサーバに保存する。

〔委託候補C社の提案・図2 複合機のスキャン機能〕
・B業務だけの専任担当者を割り当てる。
・スキャン時は従業員ごとのIDとパスワードをパネルに入力する。
・PDF化したファイルは従業員ごとに異なる鍵で暗号化し，スキャン実行本人宛てにメール送信する。
・添付ファイルが大きい場合は，C社の社内ネットワークに設置するBサーバに保存し，その保存先URLをメール本文に記載する。
・Bサーバへアクセスするには従業員ごとのIDとパスワードが必要。

〔リスク評価での発見・図3〕
・複合機からのメールは，差出人アドレス，件名，本文，添付ファイル名を全員が同じ「初期設定」のまま使用する。
・初期設定情報は複合機メーカーのWebサイトで一般公開されている。
・初期設定を変更できるのはC社の情報システム部だけ。

A社はC社と秘密保持契約を交わした後に質問表でリスク評価を実施した。その結果，初期設定のままではA社にリスクがあるため設定変更が必要と判断した。最も適切なリスクを選べ。

※IPA公開原卷の図表は上部の公式原卷リンクから確認できる。', '[{"id":"a","text":"B業務の従業員が攻撃者の偽メールを複合機からの正規メールと信じ，記載URLからフィッシングサイトに誘導され，採用予定者の個人情報が漏えいする。"},{"id":"b","text":"従業員が複合機のメールをスパムと勘違いして削除し，再スキャンが必要になって業務が遅延する。"},{"id":"c","text":"攻撃者が複合機のメールを盗聴し，添付ファイルを暗号化して身代金を要求する。"},{"id":"d","text":"攻撃者がメールを盗聴し，本文中のURLでBサーバへアクセスして採用予定者の情報を漏えいさせる。"}]', '"a"', '誰でも知る初期設定メールを装ったフィッシングが可能になることが主たるリスク。BサーバはURLだけでは入れず利用者認証が必要。', 'official', 'https://www.ipa.go.jp/shiken/mondai-kaiotu/sg_fe/koukai/t6hhco0000003zx0-att/2023r05_fe_kamoku_b_qs.pdf', 'ja', 'B', 'explicit');
INSERT OR IGNORE INTO questions (id, track_id, topic, difficulty, question_type, prompt, options_json, answer_json, explanation, source_type, source_reference, language, exam_section, exam_section_method) VALUES ('fe-ipa-official-2024-b-06', 'exam-fe', 'FE信息安全', 'standard', 'single_choice', '【2024年度 IPA公開問題 科目B 問6】A社は450名の商社で，テレワークを推進している。

〔図1 システム環境と現在のアクセス制御〕
・全従業員に社内デスクトップPCを1台貸与。
・自社設置の業務システムのほか，グループウェア（メール，チャット，クラウドストレージ）とオンライン会議サービスをSaaSで利用する。
・テレワークでは私物PC（BYOD）の業務利用を許可。社内PCから私物PCへ画面転送するリモートデスクトップ方式を採用する。
・専用アプリにはファイルのダウンロードやコピー＆ペーストを禁止する「保存禁止機能」があり，私有PC上で有効化済み。
・業務システムには社内PCのデスクトップから利用者ID・パスワードでログイン。
・二つのSaaSは，これまで社内ネットワークからだけログイン可能となるよう制限し，利用者IDとパスワードで認証する。

〔変更の背景〕
テレワークの定着によって，社内PCのインターネット接続が極端に遅くなった。通信量増加が原因であり，SaaSへのアクセスについては社内PCと社内ネットワークを通さず，私有PCから直接アクセスできるように設定変更する。

〔設問〕
直接接続を認めることでSaaSへの不正アクセスリスクが増大する。情報セキュリティリーダーBさんが情報システム部に依頼すべき最も適切な対策はどれか。', '[{"id":"a","text":"社内ネットワークから二つのSaaSへの通信を監視する。"},{"id":"b","text":"社内ネットワークとSaaSとの間の通信速度を制限する。"},{"id":"c","text":"二つのSaaSへ社外から接続する際の認証に2要素認証を導入する。"},{"id":"d","text":"グループウェアだけを直接接続の対象にする。"},{"id":"e","text":"リモートデスクトップ専用アプリの保存禁止機能を無効にする。"}]', '"c"', '従来の接続元ネットワーク制限を外すとパスワードのみでの不正ログインに対するリスクが上がる。社外接続では二要素認証を導入するのが適切。', 'official', 'https://www.ipa.go.jp/shiken/mondai-kaiotu/sg_fe/koukai/eid2eo0000007g1d-att/2024r06_fe_kamoku_b_qs.pdf', 'ja', 'B', 'explicit');
INSERT OR IGNORE INTO questions (id, track_id, topic, difficulty, question_type, prompt, options_json, answer_json, explanation, source_type, source_reference, language, exam_section, exam_section_method) VALUES ('fe-ipa-official-2025-b-06', 'exam-fe', 'FE信息安全', 'standard', 'single_choice', '【2025年度 IPA公開問題 科目B 問6】A社は東京本社・新潟工場をもつ従業員200名の電子機器メーカー。ISMS認証を取得し，CISOを中心に情報セキュリティに取り組む。

〔図1 ファイルサーバのバックアップ運用〕
・本社と工場にファイルサーバを設置する。
・磁気テープでフルバックアップを毎週土曜日02:00から実施。
・増分バックアップを翌週火曜日02:00と木曜日02:00から実施する。
・システム担当者が毎週月・火・木曜日の10:00ごろに実行結果確認と磁気テープ交換を行い，テープは耐火金庫で保管する。
・テープへの書込みは上書きモードで，1か月分を世代管理する。
・フルバックアップのリストア時間は平均4時間，増分1回分のリストアは平均0.25時間。
・ICT継続の試験を実施しておりファイルサーバも対象。
・ファイルサーバのRPO（目標復旧時点）72時間，RTO（目標復旧時間）120時間。

〔表1 管理策の評価〕
JIS Q 27001:2023 の「事業継続のためのICTの備え」について，事業継続要求事項に沿ってICT継続を計画・実施・維持・試験すべき管理策の評価は「実施している」。

〔表2 内部監査への回答〕
1. 金曜日正午に障害が起きた場合，少なくとも［a1］時点のデータは復元する必要がある。
2. 木曜日正午にファイルサーバの全データが消えた場合，バックアップからのリストアには［a2］時間を要すると予想される。
3. ICT継続の計画書は［a3］が承認している。

設問：a1・a2・a3の正しい組合せはどれか。', '[{"id":"a","text":"月曜日の正午 / 4.25 / CISO"},{"id":"b","text":"月曜日の正午 / 4.25 / 情報システム部の担当者"},{"id":"c","text":"月曜日の正午 / 4.25 / 内部監査室長"},{"id":"d","text":"月曜日の正午 / 4.50 / CISO"},{"id":"e","text":"月曜日の正午 / 4.50 / 情報システム部の担当者"},{"id":"f","text":"火曜日の正午 / 4.25 / 情報システム部の担当者"},{"id":"g","text":"火曜日の正午 / 4.25 / 内部監査室長"},{"id":"h","text":"火曜日の正午 / 4.50 / CISO"},{"id":"i","text":"火曜日の正午 / 4.50 / 情報システム部の担当者"},{"id":"j","text":"火曜日の正午 / 4.50 / 内部監査室長"}]', '"h"', '金曜12時−RPO72時間＝火曜12時。木曜12時の障害にはフル4時間＋火曜の増分0.25＋木曜の増分0.25＝4.50時間。事業継続計画書の承認者はCISOが適切。', 'official', 'https://www.ipa.go.jp/shiken/mondai-kaiotu/sg_fe/koukai/tbl5kb0000005r9r-att/2025r07_fe_kamoku_b_qs.pdf', 'ja', 'B', 'explicit');
