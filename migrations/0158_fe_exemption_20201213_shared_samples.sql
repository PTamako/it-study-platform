-- IPA 2020-12-13 Q1, Q18-Q20 are identical source questions to IPA's
-- 2022 科目A sample Q2, Q15, Q18, Q19 respectively; options and answer
-- letters were checked against both IPA papers and both answer sheets.
-- Retain existing canonical IDs and all prior study attempts and review state.
INSERT OR IGNORE INTO fe_exemption_occurrences
  (sitting_date, original_question, fiscal_year, canonical_question_id, official_answer, question_url, answer_url)
VALUES
('2020-12-13', 1, 2020, 'fe-ipa-sample-2022-a-002', 'd', 'https://www.ipa.go.jp/shiken/about/ug65p90000001bq0-att/tokurei_Mondai_20201213_FE.pdf', 'https://www.ipa.go.jp/shiken/about/ug65p90000001bq0-att/tokurei_ans_20201213_FE.pdf'),
('2020-12-13', 18, 2020, 'fe-ipa-sample-2022-a-015', 'd', 'https://www.ipa.go.jp/shiken/about/ug65p90000001bq0-att/tokurei_Mondai_20201213_FE.pdf', 'https://www.ipa.go.jp/shiken/about/ug65p90000001bq0-att/tokurei_ans_20201213_FE.pdf'),
('2020-12-13', 19, 2020, 'fe-ipa-sample-2022-a-018', 'd', 'https://www.ipa.go.jp/shiken/about/ug65p90000001bq0-att/tokurei_Mondai_20201213_FE.pdf', 'https://www.ipa.go.jp/shiken/about/ug65p90000001bq0-att/tokurei_ans_20201213_FE.pdf'),
('2020-12-13', 20, 2020, 'fe-ipa-sample-2022-a-019', 'd', 'https://www.ipa.go.jp/shiken/about/ug65p90000001bq0-att/tokurei_Mondai_20201213_FE.pdf', 'https://www.ipa.go.jp/shiken/about/ug65p90000001bq0-att/tokurei_ans_20201213_FE.pdf');
