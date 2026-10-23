-- IPA SG legacy written exam: 2019 autumn, morning questions 28-29.
-- Wording/options cross-checked against the public question set; answers cross-checked against IPA's official answer key.
-- Official question PDF: https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000dict-att/2019r01a_sg_am_qs.pdf
-- Official answer PDF: https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000dict-att/2019r01a_sg_am_ans.pdf
INSERT OR IGNORE INTO questions
  (id, track_id, topic, difficulty, question_type, prompt, options_json, answer_json, explanation, source_type, source_reference, language)
VALUES
('sg-official-2019f-am-28','exam-sg','SMTP-AUTH・メール送信認証','standard','single_choice','【2019年度 令和元年秋期 午前 問28】電子メールをドメインAの送信者がドメインBの宛先に送信するとき，送信者をドメインAのメールサーバで認証するためのものはどれか。','[{"id":"a","text":"APOP"},{"id":"b","text":"POP3S"},{"id":"c","text":"S/MIME"},{"id":"d","text":"SMTP-AUTH"}]','"d"','SMTP-AUTHはメール送信時に送信サーバが利用者を認証する仕組み。APOPとPOP3Sは主に受信側，S/MIMEはメッセージの署名・暗号化に用いる。','official','https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000dict-att/2019r01a_sg_am_qs.pdf','ja'),
('sg-official-2019f-am-29','exam-sg','ハニーポット・攻撃観測','standard','single_choice','【2019年度 令和元年秋期 午前 問29】ハニーポットの説明はどれか。','[{"id":"a","text":"サーバやネットワークを実際の攻撃に近い手法で検査し，攻撃があった場合の被害範囲を予測する。"},{"id":"b","text":"社内ネットワークに接続しようとするPCを検査専用ネットワークに接続させ，安全性を検査する。"},{"id":"c","text":"保護された領域でプログラムを動作させ，その挙動からマルウェアを検出して隔離・駆除する。"},{"id":"d","text":"わざと侵入しやすいように設定した機器やシステムをインターネット上に配置し，攻撃手法やマルウェアの振る舞いを調査・研究する。"}]','"d"','ハニーポットは攻撃者を誘引するための疑似システムで，攻撃手法やマルウェアの挙動を観測する。アは侵入テスト，イは検疫ネットワーク，ウはサンドボックスの説明。','official','https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000dict-att/2019r01a_sg_am_qs.pdf','ja');
