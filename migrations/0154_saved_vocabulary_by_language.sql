-- Additive change: migrate previous bookmarks and tombstones into language-qualified keys.
-- Do not drop, delete, update, or rename the legacy table. Existing records survive intact.
CREATE TABLE IF NOT EXISTS saved_vocabulary_entries_v2 (
  language TEXT NOT NULL DEFAULT 'auto' CHECK(language IN ('auto','ja','en','zh')),
  term TEXT NOT NULL,
  entry_json TEXT NOT NULL,
  saved_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (language, term)
);
INSERT OR IGNORE INTO saved_vocabulary_entries_v2 (language,term,entry_json,saved_at)
SELECT language,term,entry_json,saved_at FROM saved_vocabulary_entries;
CREATE INDEX IF NOT EXISTS idx_saved_vocabulary_v2_saved
ON saved_vocabulary_entries_v2(saved_at DESC);
