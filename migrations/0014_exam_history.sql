-- Persist manually entered and simulated exam summaries previously stored only in browser localStorage.
-- Client-generated IDs make imports idempotent across reloads and retries.
CREATE TABLE IF NOT EXISTS exam_history (
  id TEXT PRIMARY KEY,
  study_date TEXT NOT NULL,
  exam_name TEXT NOT NULL,
  question_count INTEGER NOT NULL CHECK (question_count BETWEEN 1 AND 10000),
  correct_count INTEGER NOT NULL CHECK (correct_count BETWEEN 0 AND question_count),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_exam_history_date ON exam_history(study_date, created_at);
