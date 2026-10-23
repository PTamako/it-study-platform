-- IPA SG legacy written exam: 2018 spring, morning question 37.
-- Official question paper and answer key:
-- https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000f01f-att/2018h30h_sg_am_qs.pdf
-- https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000fabr-att/2018h30h_sg_am_ans.pdf
INSERT OR IGNORE INTO questions
  (id, track_id, topic, difficulty, question_type, prompt, options_json, answer_json, explanation, source_type, source_reference, language)
VALUES
('sg-official-2018-spring-am-37','exam-sg','データ連携・コントロールトータルチェック','standard','single_choice','【平成30年度 春期 午前 問37】複数の情報システム間でのデータ連携において，送信側システムで集計した送信データの件数の合計と，受信側システムで集計した受信データの件数の合計を照合し，確認するためのコントロールはどれか。','[{"id":"a","text":"アクセスコントロール"},{"id":"b","text":"エディットバリデーションチェック"},{"id":"c","text":"コントロールトータルチェック"},{"id":"d","text":"チェックデジット"}]','"c"','送信側と受信側のデータ件数などの合計値を照合する統制はコントロールトータルチェックである。','official','https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000f01f-att/2018h30h_sg_am_qs.pdf','ja');
