-- Spaced-repetition state for each language card.
-- One row per card; this follows the app's existing shared progress model.
CREATE TABLE IF NOT EXISTS language_card_reviews (
  card_id TEXT PRIMARY KEY REFERENCES language_cards(id) ON DELETE CASCADE,
  review_count INTEGER NOT NULL DEFAULT 0,
  correct_streak INTEGER NOT NULL DEFAULT 0,
  next_review_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_reviewed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_result TEXT NOT NULL DEFAULT 'again' CHECK (last_result IN ('again', 'remembered')),
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_language_card_reviews_due
  ON language_card_reviews(next_review_at);
