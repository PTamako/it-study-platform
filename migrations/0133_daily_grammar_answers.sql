-- Personal daily grammar answers: one small indexed row per answered question.
-- The answer is immutable (first submitted answer wins) and existing learning
-- records/tables are neither altered nor deleted.
CREATE TABLE IF NOT EXISTS daily_grammar_answers (
  study_date TEXT NOT NULL,
  language TEXT NOT NULL CHECK (language IN ('ja', 'en')),
  question_id TEXT NOT NULL,
  answer_index INTEGER NOT NULL CHECK (answer_index BETWEEN 0 AND 3),
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (study_date, language, question_id)
) WITHOUT ROWID;
