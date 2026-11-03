-- Track IPA's 2022 PUBLIC SAMPLE SET separately from actual published CBT questions.
-- Safe additive metadata: preserve existing question IDs, user answers and study history.
-- SQLite/D1 does not permit extending the existing source_type CHECK in-place.
-- Retain source_type='licensed' for attributed adaptations and use an explicit kind.
ALTER TABLE questions ADD COLUMN question_kind TEXT NOT NULL DEFAULT 'standard'
  CHECK (question_kind IN ('standard', 'official_sample'));

-- Reuse the existing (track_id, id) index for stable ID scans; no extra index yet.
