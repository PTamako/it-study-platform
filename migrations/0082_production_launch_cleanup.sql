-- One-time production launch cleanup.
-- Clear personal learning history and test-only starter questions while preserving
-- the real question bank, language cards, dictionary entries, and practical scenarios.

PRAGMA foreign_keys = ON;

-- Personal study history / progress.
DELETE FROM study_attempts;
DELETE FROM scenario_attempts;
DELETE FROM exam_history;
DELETE FROM exam_sessions;
DELETE FROM study_plans;
DELETE FROM daily_study_logs;
DELETE FROM language_card_progress;
DELETE FROM language_card_reviews;
DELETE FROM saved_vocabulary_entries;
DELETE FROM daily_task_completions;
DELETE FROM study_preferences;
DELETE FROM question_review_state;

-- Clear temporary authentication throttling state; it will be rebuilt naturally.
DELETE FROM auth_login_rate_limits;
DELETE FROM auth_write_rate_limits;

-- Remove the five explicitly labeled v1 demo questions from the initial setup.
DELETE FROM questions
WHERE id IN ('sg-gen-0001', 'sg-gen-0002', 'sg-gen-0003', 'sg-gen-0004', 'sg-gen-0005')
   OR source_reference = '平台自编练习题 v1';

-- These legacy tables have no current application/API references. Keep the
-- vocabulary table itself: the live dictionary API queries it.
DROP TABLE IF EXISTS vocabulary_relations;
DROP TABLE IF EXISTS study_plans;
DROP TABLE IF EXISTS daily_study_logs;
DROP TABLE IF EXISTS exam_sessions;
DROP TABLE IF EXISTS study_preferences;
