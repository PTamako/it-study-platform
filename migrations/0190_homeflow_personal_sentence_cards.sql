-- 0190 Stage E: manual sentence cards scoped to immutable HomeFlow user ID.
-- Additive; NEVER move or delete original public/Tatoeba/legacy sentence data.
-- Document-sourced cards require a separate trusted owner-approved executor.
-- UNEXECUTED in production: F release authorization is required.
CREATE TABLE IF NOT EXISTS homeflow_personal_sentence_cards (
 homeflow_user_id TEXT NOT NULL REFERENCES homeflow_identity_links(homeflow_user_id) ON DELETE RESTRICT,
 card_id TEXT NOT NULL CHECK(length(card_id)=32),
 language TEXT NOT NULL CHECK(language IN ('ja','en')),
 sentence_text TEXT NOT NULL CHECK(length(sentence_text) BETWEEN 1 AND 700),
 translation_zh TEXT NOT NULL DEFAULT '' CHECK(length(translation_zh)<=700),
 notes TEXT NOT NULL DEFAULT '' CHECK(length(notes)<=500),
 source_kind TEXT NOT NULL DEFAULT 'manual' CHECK(source_kind='manual'),
 is_deleted INTEGER NOT NULL DEFAULT 0 CHECK(is_deleted IN (0,1)),
 version INTEGER NOT NULL DEFAULT 1 CHECK(version>=1),
 updated_by_user_id TEXT NOT NULL REFERENCES homeflow_identity_links(homeflow_user_id) ON DELETE RESTRICT,
 updated_at TEXT NOT NULL,
 PRIMARY KEY(homeflow_user_id,card_id)
) WITHOUT ROWID;
CREATE TABLE IF NOT EXISTS homeflow_personal_sentence_events (
 event_id TEXT PRIMARY KEY NOT NULL,
 actor_user_id TEXT NOT NULL REFERENCES homeflow_identity_links(homeflow_user_id) ON DELETE RESTRICT,
 card_id TEXT NOT NULL,
 action TEXT NOT NULL CHECK(action IN ('saved','edited','removed')),
 created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_hf_sentence_events_actor
 ON homeflow_personal_sentence_events(actor_user_id,created_at);
CREATE TRIGGER IF NOT EXISTS trg_hf_sentence_owner_insert
 BEFORE INSERT ON homeflow_personal_sentence_cards
 WHEN NEW.homeflow_user_id<>NEW.updated_by_user_id OR NOT EXISTS(
  SELECT 1 FROM homeflow_identity_links l WHERE l.homeflow_user_id=NEW.homeflow_user_id
   AND l.state='active')
 BEGIN SELECT RAISE(ABORT,'SENTENCE_OWNER_REQUIRED'); END;
CREATE TRIGGER IF NOT EXISTS trg_hf_sentence_owner_update
 BEFORE UPDATE ON homeflow_personal_sentence_cards
 WHEN NEW.homeflow_user_id<>OLD.homeflow_user_id OR NEW.card_id<>OLD.card_id
  OR NEW.updated_by_user_id<>OLD.homeflow_user_id OR NEW.version<>OLD.version+1
  OR NEW.source_kind<>OLD.source_kind OR NOT EXISTS(
   SELECT 1 FROM homeflow_identity_links l WHERE l.homeflow_user_id=OLD.homeflow_user_id
    AND l.state='active')
 BEGIN SELECT RAISE(ABORT,'SENTENCE_OWNER_REQUIRED'); END;
CREATE TRIGGER IF NOT EXISTS trg_hf_sentence_no_delete
 BEFORE DELETE ON homeflow_personal_sentence_cards
 BEGIN SELECT RAISE(ABORT,'SENTENCE_PHYSICAL_DELETE_FORBIDDEN'); END;
CREATE TRIGGER IF NOT EXISTS trg_hf_sentence_audit_no_update
 BEFORE UPDATE ON homeflow_personal_sentence_events
 BEGIN SELECT RAISE(ABORT,'IMMUTABLE_SENTENCE_AUDIT'); END;
CREATE TRIGGER IF NOT EXISTS trg_hf_sentence_audit_no_delete
 BEFORE DELETE ON homeflow_personal_sentence_events
 BEGIN SELECT RAISE(ABORT,'IMMUTABLE_SENTENCE_AUDIT'); END;
