-- IPA SG legacy written exam: 2018 spring, morning questions 9 and 13.
-- Official question paper and answer key:
-- https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000f01f-att/2018h30h_sg_am_qs.pdf
-- https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000fabr-att/2018h30h_sg_am_ans.pdf
INSERT OR IGNORE INTO questions
  (id, track_id, topic, difficulty, question_type, prompt, options_json, answer_json, explanation, source_type, source_reference, language)
VALUES
('sg-official-2018-spring-am-09','exam-sg','ネットワーク監視・LANアナライザ','standard','single_choice','【平成30年度 春期 午前 問9】ネットワーク障害の原因を調べるために，ミラーポート及びLANアナライザを用意し，LANアナライザを使用できるようにしておくときに，留意することはどれか。','[{"id":"a","text":"LANアナライザがパケットを破棄するので，測定中は測定対象外のコンピュータの利用を制限しておく必要がある。"},{"id":"b","text":"LANアナライザはネットワークを通過するパケットを表示できるので，盗聴などに悪用されないように注意する必要がある。"},{"id":"c","text":"障害発生に備えて，ネットワーク利用者にLANアナライザの保管場所と使用方法を周知しておく必要がある。"},{"id":"d","text":"測定時にLANケーブルを一時的に抜く必要があるので，ネットワーク利用者に測定日を事前に知らせておく必要がある。"}]','"b"','LANアナライザは通信内容を観測できるため，機密情報の閲覧や盗聴につながらないよう管理する。','official','https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000f01f-att/2018h30h_sg_am_qs.pdf','ja'),
('sg-official-2018-spring-am-13','exam-sg','サーバセキュリティ・不要サービス停止','standard','single_choice','【平成30年度 春期 午前 問13】サーバへの侵入を防止するのに有効な対策はどれか。','[{"id":"a","text":"サーバ上にあるファイルのフィンガプリントを保存する。"},{"id":"b","text":"サーバ上の不要なサービスを停止する。"},{"id":"c","text":"サーバのバックアップを定期的に取得する。"},{"id":"d","text":"サーバを冗長化して耐故障性を高める。"}]','"b"','不要なサービスを停止して攻撃対象領域を減らすことは，サーバへの侵入防止に有効である。','official','https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000f01f-att/2018h30h_sg_am_qs.pdf','ja');
