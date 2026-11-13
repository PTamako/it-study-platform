-- The December 2022 Q10 and IPA 2022 sample A Q8 are the same problem with
-- identical option order. Only consolidate while the exemption copy is unused;
-- any existing review or attempt must remain untouched for later reconciliation.
UPDATE fe_exemption_occurrences
SET canonical_question_id='fe-ipa-sample-2022-a-008'
WHERE sitting_date='2022-12-11' AND original_question=10
  AND canonical_question_id='fe-exempt-2022-20221211-q10'
  AND EXISTS (SELECT 1 FROM questions WHERE id='fe-ipa-sample-2022-a-008' AND answer_json='"c"')
  AND NOT EXISTS (SELECT 1 FROM study_attempts WHERE question_id='fe-exempt-2022-20221211-q10')
  AND NOT EXISTS (SELECT 1 FROM question_review_state WHERE question_id='fe-exempt-2022-20221211-q10');

DELETE FROM questions
WHERE id='fe-exempt-2022-20221211-q10'
  AND EXISTS (SELECT 1 FROM fe_exemption_occurrences WHERE sitting_date='2022-12-11' AND original_question=10 AND canonical_question_id='fe-ipa-sample-2022-a-008')
  AND NOT EXISTS (SELECT 1 FROM fe_exemption_occurrences WHERE canonical_question_id='fe-exempt-2022-20221211-q10')
  AND NOT EXISTS (SELECT 1 FROM study_attempts WHERE question_id='fe-exempt-2022-20221211-q10')
  AND NOT EXISTS (SELECT 1 FROM question_review_state WHERE question_id='fe-exempt-2022-20221211-q10')
  AND NOT EXISTS (SELECT 1 FROM daily_grammar_answers WHERE question_id='fe-exempt-2022-20221211-q10');
