-- 0187 Stage E: HomeFlow-scoped daily grammar answers (UNEXECUTED).
-- Requires 0180. Old daily_grammar_answers remain untouched and owner-only.
-- Never run against production before the user's A-stage restore sign-off.
CREATE TABLE IF NOT EXISTS homeflow_grammar_answers (
  homeflow_user_id TEXT NOT NULL REFERENCES homeflow_identity_links(homeflow_user_id) ON DELETE RESTRICT,
  study_date TEXT NOT NULL CHECK(length(study_date)=10),
  language TEXT NOT NULL CHECK(language IN ('ja','en')),
  question_id TEXT NOT NULL CHECK(length(question_id) BETWEEN 1 AND 160),
  answer_index INTEGER NOT NULL CHECK(answer_index BETWEEN 0 AND 3),
  updated_by_user_id TEXT NOT NULL REFERENCES homeflow_identity_links(homeflow_user_id) ON DELETE RESTRICT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(homeflow_user_id,study_date,language,question_id)
) WITHOUT ROWID;
-- The composite PRIMARY KEY already indexes (user,date,language,question).
CREATE TABLE IF NOT EXISTS homeflow_grammar_events (
  event_id TEXT PRIMARY KEY NOT NULL,
  actor_user_id TEXT NOT NULL REFERENCES homeflow_identity_links(homeflow_user_id) ON DELETE RESTRICT,
  action TEXT NOT NULL CHECK(action IN ('answered','legacy_adopted')),
  affected_count INTEGER NOT NULL CHECK(affected_count BETWEEN 1 AND 20),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_hf_grammar_events_actor
 ON homeflow_grammar_events(actor_user_id,created_at);
CREATE TRIGGER IF NOT EXISTS trg_hf_grammar_answers_insert
 BEFORE INSERT ON homeflow_grammar_answers
 WHEN NEW.homeflow_user_id!=NEW.updated_by_user_id OR
  NOT EXISTS (SELECT 1 FROM homeflow_identity_links l
   WHERE l.homeflow_user_id=NEW.homeflow_user_id AND l.state='active')
 BEGIN SELECT RAISE(ABORT,'GRAMMAR_OWNER_REQUIRED'); END;
-- A concurrent conflicting first answer is not allowed to be silently ignored.
-- RAISE(ABORT) aborts the whole atomic D1 batch, including adoption audit.
CREATE TRIGGER IF NOT EXISTS trg_hf_grammar_conflicting_insert
 BEFORE INSERT ON homeflow_grammar_answers
 WHEN EXISTS (SELECT 1 FROM homeflow_grammar_answers existing
  WHERE existing.homeflow_user_id=NEW.homeflow_user_id
   AND existing.study_date=NEW.study_date
   AND existing.language=NEW.language
   AND existing.question_id=NEW.question_id
   AND existing.answer_index<>NEW.answer_index)
 BEGIN SELECT RAISE(ABORT,'GRAMMAR_ANSWER_CONFLICT'); END;
CREATE TRIGGER IF NOT EXISTS trg_hf_grammar_answers_no_update
 BEFORE UPDATE ON homeflow_grammar_answers
 BEGIN SELECT RAISE(ABORT,'IMMUTABLE_GRAMMAR_ANSWER'); END;
CREATE TRIGGER IF NOT EXISTS trg_hf_grammar_answers_no_delete
 BEFORE DELETE ON homeflow_grammar_answers
 BEGIN SELECT RAISE(ABORT,'IMMUTABLE_GRAMMAR_ANSWER'); END;
CREATE TRIGGER IF NOT EXISTS trg_hf_grammar_events_no_update
 BEFORE UPDATE ON homeflow_grammar_events
 BEGIN SELECT RAISE(ABORT,'IMMUTABLE_GRAMMAR_AUDIT'); END;
CREATE TRIGGER IF NOT EXISTS trg_hf_grammar_events_no_delete
 BEFORE DELETE ON homeflow_grammar_events
 BEGIN SELECT RAISE(ABORT,'IMMUTABLE_GRAMMAR_AUDIT'); END;
