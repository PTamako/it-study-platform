-- Accelerate common exact IT term lookups before any alias/translation fallback.
-- Safe additive index on a small public glossary; does not change personal data.
CREATE INDEX IF NOT EXISTS idx_vocabulary_term_nocase ON vocabulary(term COLLATE NOCASE);
