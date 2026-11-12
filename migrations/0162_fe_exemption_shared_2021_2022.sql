-- IPA source-verified repeated questions. Link occurrences to existing canonical
-- questions so review state and study history stay attached to the same IDs.
INSERT OR IGNORE INTO fe_exemption_occurrences (sitting_date,original_question,fiscal_year,canonical_question_id,official_answer,question_url,answer_url) VALUES
('2021-06-13',5,'2021','fe-ipa-sample-2022-a-004','a','https://www.ipa.go.jp/shiken/about/ug65p90000001bq0-att/tokurei_Mondai_20210613_FE.pdf','https://www.ipa.go.jp/shiken/about/ug65p90000001bq0-att/tokurei_ans_20210613_FE.pdf'),
('2022-12-11',27,'2022','fe-exempt-2020-20201213-q28','d','https://www.ipa.go.jp/shiken/about/ug65p90000001bq0-att/tokurei_Mondai_20221211_FE.pdf','https://www.ipa.go.jp/shiken/about/ug65p90000001bq0-att/tokurei_ans_20221211_FE.pdf'),
('2022-12-11',49,'2022','fe-ipa-2019-spring-am-adapt-50','a','https://www.ipa.go.jp/shiken/about/ug65p90000001bq0-att/tokurei_Mondai_20221211_FE.pdf','https://www.ipa.go.jp/shiken/about/ug65p90000001bq0-att/tokurei_ans_20221211_FE.pdf');
