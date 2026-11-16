-- 0188 Stage E: HomeFlow private listening practice answers (UNEXECUTED).
-- Requires 0180; 0150 daily_listening_answers remains original owner history.
-- No production migration until user expressly authorizes release.
CREATE TABLE IF NOT EXISTS homeflow_listening_answers (
 homeflow_user_id TEXT NOT NULL REFERENCES homeflow_identity_links(homeflow_user_id) ON DELETE RESTRICT,
 study_date TEXT NOT NULL CHECK(length(study_date)=10),
 language TEXT NOT NULL CHECK(language IN ('ja','en')),
 scene_id TEXT NOT NULL CHECK(length(scene_id) BETWEEN 1 AND 160),
 answer_index INTEGER NOT NULL CHECK(answer_index BETWEEN 0 AND 3),
 updated_by_user_id TEXT NOT NULL REFERENCES homeflow_identity_links(homeflow_user_id) ON DELETE RESTRICT,
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY(homeflow_user_id,study_date,language,scene_id)
) WITHOUT ROWID;
-- The composite PRIMARY KEY covers all user/date/language reads.
CREATE TABLE IF NOT EXISTS homeflow_listening_events (
 event_id TEXT PRIMARY KEY NOT NULL,
 actor_user_id TEXT NOT NULL REFERENCES homeflow_identity_links(homeflow_user_id) ON DELETE RESTRICT,
 action TEXT NOT NULL CHECK(action IN ('answered','legacy_adopted')),
 affected_count INTEGER NOT NULL CHECK(affected_count BETWEEN 1 AND 20),
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_hf_listening_audit_actor
 ON homeflow_listening_events(actor_user_id,created_at);
CREATE TRIGGER IF NOT EXISTS trg_hf_listening_actor_insert
 BEFORE INSERT ON homeflow_listening_answers
 WHEN NEW.homeflow_user_id<>NEW.updated_by_user_id OR NOT EXISTS(
  SELECT 1 FROM homeflow_identity_links l
  WHERE l.homeflow_user_id=NEW.homeflow_user_id AND l.state='active')
 BEGIN SELECT RAISE(ABORT,'LISTENING_OWNER_REQUIRED'); END;
CREATE TRIGGER IF NOT EXISTS trg_hf_listening_answer_conflict
 BEFORE INSERT ON homeflow_listening_answers
 WHEN EXISTS(SELECT 1 FROM homeflow_listening_answers x
  WHERE x.homeflow_user_id=NEW.homeflow_user_id
   AND x.study_date=NEW.study_date AND x.language=NEW.language
   AND x.scene_id=NEW.scene_id AND x.answer_index<>NEW.answer_index)
 BEGIN SELECT RAISE(ABORT,'LISTENING_ANSWER_CONFLICT'); END;
CREATE TRIGGER IF NOT EXISTS trg_hf_listening_answer_immutable_update
 BEFORE UPDATE ON homeflow_listening_answers
 BEGIN SELECT RAISE(ABORT,'IMMUTABLE_LISTENING_ANSWER'); END;
CREATE TRIGGER IF NOT EXISTS trg_hf_listening_answer_immutable_delete
 BEFORE DELETE ON homeflow_listening_answers
 BEGIN SELECT RAISE(ABORT,'IMMUTABLE_LISTENING_ANSWER'); END;
CREATE TRIGGER IF NOT EXISTS trg_hf_listening_event_immutable_update
 BEFORE UPDATE ON homeflow_listening_events
 BEGIN SELECT RAISE(ABORT,'IMMUTABLE_LISTENING_AUDIT'); END;
CREATE TRIGGER IF NOT EXISTS trg_hf_listening_event_immutable_delete
 BEFORE DELETE ON homeflow_listening_events
 BEGIN SELECT RAISE(ABORT,'IMMUTABLE_LISTENING_AUDIT'); END;
