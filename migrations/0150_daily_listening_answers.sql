-- Small, indexed, first-answer-wins listening history: two rows per day/language.
-- Preserves existing grammar, review and exam state without rewriting any table.
CREATE TABLE IF NOT EXISTS daily_listening_answers (
  study_date TEXT NOT NULL,
  language TEXT NOT NULL CHECK (language IN ('ja', 'en')),
  scene_id TEXT NOT NULL,
  answer_index INTEGER NOT NULL CHECK (answer_index BETWEEN 0 AND 3),
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (study_date, language, scene_id)
) WITHOUT ROWID;
