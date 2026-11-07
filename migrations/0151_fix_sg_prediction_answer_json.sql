-- Correct one malformed JSON answer from legacy 0045, retaining the stable
-- question ID, options and all existing attempt/review history.
-- Safe when the production row was already repaired during incident response.
UPDATE questions
SET answer_json = '"b"'
WHERE id = 'sg-pred-bulk-452' AND answer_json = '"b';
