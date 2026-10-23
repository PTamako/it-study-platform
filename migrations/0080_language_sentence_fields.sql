-- Sentence-first language curriculum. Legacy vocabulary rows and historical progress are retained.
ALTER TABLE language_cards ADD COLUMN content_type TEXT NOT NULL DEFAULT 'word';
ALTER TABLE language_cards ADD COLUMN source_url TEXT NOT NULL DEFAULT '';
ALTER TABLE language_cards ADD COLUMN highlight_json TEXT NOT NULL DEFAULT '[]';
ALTER TABLE language_cards ADD COLUMN vocabulary_expansion_json TEXT NOT NULL DEFAULT '[]';
ALTER TABLE language_cards ADD COLUMN grammar_expansion_json TEXT NOT NULL DEFAULT '[]';
