-- FE 修了試験の出典を通常の本試験問題/公式サンプルと区別する。
-- Additive: existing questions and user progress remain unchanged.
ALTER TABLE questions ADD COLUMN exam_origin TEXT NOT NULL DEFAULT 'general'
  CHECK(exam_origin IN ('general','fe_exemption'));

-- One canonical question text may occur at several official exemption sittings.
-- This relationship keeps the original sitting and question number without
-- replicating the full prompt, solution, or per-user review state.
CREATE TABLE IF NOT EXISTS fe_exemption_occurrences (
  sitting_date TEXT NOT NULL,
  original_question INTEGER NOT NULL CHECK(original_question BETWEEN 1 AND 80),
  fiscal_year INTEGER NOT NULL CHECK(fiscal_year BETWEEN 2000 AND 2100),
  canonical_question_id TEXT NOT NULL REFERENCES questions(id),
  official_answer TEXT NOT NULL CHECK(official_answer IN ('a','b','c','d')),
  question_url TEXT NOT NULL,
  answer_url TEXT NOT NULL,
  PRIMARY KEY (sitting_date, original_question)
);
CREATE INDEX IF NOT EXISTS idx_fe_exemption_occurrences_question
 ON fe_exemption_occurrences(canonical_question_id);

-- Filter FY2020/21/22 by the occurrence fiscal year, not the first canonical ID.
-- The composite index makes year-scoped lookup selective and keeps repeated
-- original questions from requiring duplicate question rows or D1 scans.
CREATE INDEX IF NOT EXISTS idx_fe_exemption_occurrences_year_question
 ON fe_exemption_occurrences(fiscal_year, canonical_question_id);
