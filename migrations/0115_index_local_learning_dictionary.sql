-- Reuse the existing 6,000+ licensed learner word cards as the first-party dictionary.
-- This is additive: no duplicated dictionary table, no personal-state changes.
-- Exact-match query uses the partial index and never scans sentence cards.
CREATE INDEX IF NOT EXISTS idx_language_cards_learner_dictionary
  ON language_cards(language, term COLLATE NOCASE)
  WHERE content_type = 'word';
