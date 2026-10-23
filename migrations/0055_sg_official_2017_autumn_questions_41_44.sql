-- Official SG past questions: 2017 autumn, text-representable questions 41 and 44.
-- Questions requiring unavailable graph details are intentionally omitted.
INSERT OR IGNORE INTO questions
(id,track_id,topic,difficulty,question_type,prompt,options_json,answer_json,explanation,source_type,source_reference,language)
VALUES
('sg-official-h29a-2017-q41','exam-sg','サービスマネジメント・PDCA','standard','single_choice','サービスマネジメントシステムにPDCA方法論を適用するとき，Actに該当するものはどれか。','[{"id":"a","text":"サービスの設計，移行，提供及び改善のためにサービスマネジメントシステムを導入し，運用する。"},{"id":"b","text":"サービスマネジメントシステム及びサービスのパフォーマンスを継続的に改善するための処置を実施する。"},{"id":"c","text":"サービスマネジメントシステムを確立し，文書化し，合意する。"},{"id":"d","text":"サービスマネジメントシステム及びサービスを監視，測定，レビューし，結果を報告する。"}]','"b"','正解はイ。PDCAのActは評価結果に基づいて改善処置を実施する段階である。','official','https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000fqpm-att/2017h29a_sg_am_qs.pdf','ja'),
('sg-official-h29a-2017-q44','exam-sg','プロジェクト管理・ガントチャート','standard','single_choice','工程管理図表に関する記述のうち，ガントチャートの特徴はどれか。','[{"id":"a","text":"工程管理上の重要ポイントを期日として示し，意思決定すべき期日を管理できる。"},{"id":"b","text":"個々の作業の順序関係，所要日数，余裕日数などを把握できる。"},{"id":"c","text":"作業開始・終了の予定と実績や，作業中の項目などを把握できる。"},{"id":"d","text":"作業の出来高の時間的推移を表し，費用管理と進捗管理を同時に行える。"}]','"c"','正解はウ。ガントチャートは作業項目ごとの予定・実績期間を横棒で表し，進捗状況を把握しやすくする。','official','https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000fqpm-att/2017h29a_sg_am_qs.pdf','ja');
