PRAGMA foreign_keys = ON;

-- Personal single-user progress tables. Add authentication/user_id before multi-user public use.
CREATE TABLE IF NOT EXISTS language_card_progress (
  card_id TEXT PRIMARY KEY,
  mastered INTEGER NOT NULL DEFAULT 0 CHECK (mastered IN (0, 1)),
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (card_id) REFERENCES language_cards(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS saved_vocabulary_entries (
  term TEXT PRIMARY KEY,
  language TEXT NOT NULL DEFAULT 'auto' CHECK (language IN ('auto', 'ja', 'en', 'zh')),
  entry_json TEXT NOT NULL,
  saved_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS daily_task_completions (
  task_id TEXT NOT NULL,
  study_date TEXT NOT NULL,
  completed INTEGER NOT NULL DEFAULT 0 CHECK (completed IN (0, 1)),
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (task_id, study_date)
);

CREATE TABLE IF NOT EXISTS study_preferences (
  preference_key TEXT PRIMARY KEY,
  preference_value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
