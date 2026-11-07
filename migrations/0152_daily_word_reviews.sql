-- Per-word recall state for the single-user Japanese/English daily five-word rotation.
-- Additive only; existing browser progress is imported after authentication.
CREATE TABLE IF NOT EXISTS daily_word_reviews (
  word_key TEXT PRIMARY KEY NOT NULL,
  streak INTEGER NOT NULL DEFAULT 0 CHECK(streak BETWEEN 0 AND 5),
  next_date TEXT NOT NULL,
  last_date TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
