-- Add-on AI dictionary explanations are explicitly requested, authenticated and
-- limited to 20 new inference attempts per Japan-calendar day across this app.
-- Original glossary, saved words, learning records and exam tables are unchanged.
CREATE TABLE IF NOT EXISTS dictionary_ai_daily_usage (
  study_date TEXT PRIMARY KEY,
  used INTEGER NOT NULL DEFAULT 0 CHECK(used >= 0 AND used <= 20)
);
CREATE TABLE IF NOT EXISTS dictionary_ai_explanation_cache (
  request_hash TEXT PRIMARY KEY,
  explanation TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_dictionary_ai_cache_created ON dictionary_ai_explanation_cache(created_at);
