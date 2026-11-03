-- Add a third review judgement without rebuilding the table or rewriting existing history.
-- Existing last_result CHECK stays compatible with old clients. "hard" is stored
-- exclusively in last_grade, while last_result remains "again" for old readers.
ALTER TABLE language_card_reviews
  ADD COLUMN last_grade TEXT CHECK (last_grade IS NULL OR last_grade IN ('again', 'hard', 'remembered'));
