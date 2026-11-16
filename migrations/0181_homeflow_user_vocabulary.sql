-- 0181 Stage E isolated per-HomeFlow-user saved vocabulary (UNEXECUTED).
-- Requires 0180 identity table. Never replaces, deletes, updates or
-- repartitions the original single-user saved_vocabulary_entries_v2.
-- Verified original owner adopts historical rows explicitly via backend;
-- member starts with zero inherited vocabulary and may save same term.
CREATE TABLE IF NOT EXISTS homeflow_saved_vocabulary (
 homeflow_user_id TEXT NOT NULL REFERENCES homeflow_identity_links(homeflow_user_id)
   ON DELETE RESTRICT,
 language TEXT NOT NULL CHECK(language IN ('auto','en','ja','zh')),
 term TEXT NOT NULL CHECK(length(term) BETWEEN 1 AND 100),
 entry_json TEXT NOT NULL CHECK(json_valid(entry_json)),
 is_deleted INTEGER NOT NULL DEFAULT 0 CHECK(is_deleted IN (0,1)),
 updated_by_user_id TEXT NOT NULL REFERENCES homeflow_identity_links(homeflow_user_id)
   ON DELETE RESTRICT,
 saved_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY(homeflow_user_id,language,term)
);
CREATE INDEX IF NOT EXISTS idx_hf_saved_vocabulary_user_recent
 ON homeflow_saved_vocabulary(homeflow_user_id,is_deleted,saved_at DESC);
CREATE TABLE IF NOT EXISTS homeflow_vocabulary_events (
 event_id TEXT PRIMARY KEY NOT NULL,
 actor_user_id TEXT NOT NULL REFERENCES homeflow_identity_links(homeflow_user_id)
   ON DELETE RESTRICT,
 action TEXT NOT NULL CHECK(action IN ('legacy_adopted','saved','removed')),
 term_sha256 TEXT CHECK(term_sha256 IS NULL OR length(term_sha256)=64),
 affected_count INTEGER NOT NULL DEFAULT 1 CHECK(affected_count>=1),
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_hf_vocabulary_audit_actor
 ON homeflow_vocabulary_events(actor_user_id,created_at);
CREATE TRIGGER IF NOT EXISTS trg_hf_vocabulary_event_immutable_update
 BEFORE UPDATE ON homeflow_vocabulary_events
 BEGIN SELECT RAISE(ABORT,'IMMUTABLE_VOCABULARY_AUDIT'); END;
CREATE TRIGGER IF NOT EXISTS trg_hf_vocabulary_event_immutable_delete
 BEFORE DELETE ON homeflow_vocabulary_events
 BEGIN SELECT RAISE(ABORT,'IMMUTABLE_VOCABULARY_AUDIT'); END;
-- Actor/owner must match for ordinary personal vocabulary changes.
CREATE TRIGGER IF NOT EXISTS trg_hf_vocabulary_actor_matches_owner_insert
 BEFORE INSERT ON homeflow_saved_vocabulary
 WHEN NEW.homeflow_user_id!=NEW.updated_by_user_id
  OR NOT EXISTS (SELECT 1 FROM homeflow_identity_links l
    WHERE l.homeflow_user_id=NEW.homeflow_user_id AND l.state='active')
 BEGIN SELECT RAISE(ABORT,'VOCABULARY_OWNER_REQUIRED'); END;
CREATE TRIGGER IF NOT EXISTS trg_hf_vocabulary_actor_matches_owner_update
 BEFORE UPDATE ON homeflow_saved_vocabulary
 WHEN NEW.homeflow_user_id!=OLD.homeflow_user_id
  OR NEW.updated_by_user_id!=NEW.homeflow_user_id
 BEGIN SELECT RAISE(ABORT,'VOCABULARY_OWNER_REQUIRED'); END;
