-- Additive 3-way spaced-repetition feedback; preserve every historic review row.
-- last_result retains its original CHECK ('again','remembered') for older clients.
-- A NULL last_grade denotes a legacy row; read COALESCE(last_grade,last_result).
ALTER TABLE language_card_reviews
  ADD COLUMN last_grade TEXT CHECK (last_grade IN ('again', 'hard', 'remembered'));
