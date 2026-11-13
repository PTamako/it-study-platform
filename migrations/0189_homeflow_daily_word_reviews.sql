-- 0189 Stage E: private daily-word spaced recall per HomeFlow user.
-- Additive only. Original 0152 daily_word_reviews is preserved for the proven owner.
-- NEVER apply production D1 migration before explicit release authorization.
CREATE TABLE IF NOT EXISTS homeflow_daily_word_reviews (
 homeflow_user_id TEXT NOT NULL REFERENCES homeflow_identity_links(homeflow_user_id) ON DELETE RESTRICT,
 word_key TEXT NOT NULL CHECK(length(word_key) BETWEEN 4 AND 84),
 streak INTEGER NOT NULL CHECK(streak BETWEEN 0 AND 5),
 next_date TEXT NOT NULL CHECK(length(next_date)=10),
 last_date TEXT NOT NULL CHECK(length(last_date)=10),
 version INTEGER NOT NULL DEFAULT 1 CHECK(version>=1),
 updated_by_user_id TEXT NOT NULL REFERENCES homeflow_identity_links(homeflow_user_id) ON DELETE RESTRICT,
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY(homeflow_user_id,word_key)
) WITHOUT ROWID;
-- Composite PK naturally covers owner-only list, word lookup and after cursor.
CREATE TABLE IF NOT EXISTS homeflow_daily_word_events (
 event_id TEXT PRIMARY KEY NOT NULL,
 actor_user_id TEXT NOT NULL REFERENCES homeflow_identity_links(homeflow_user_id) ON DELETE RESTRICT,
 action TEXT NOT NULL CHECK(action IN ('graded','legacy_adopted')),
 affected_count INTEGER NOT NULL CHECK(affected_count BETWEEN 1 AND 20),
 word_key TEXT,
 remembered INTEGER CHECK(remembered IN (0,1)),
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CHECK((action='graded' AND word_key IS NOT NULL AND remembered IS NOT NULL
  AND affected_count=1) OR
  (action='legacy_adopted' AND word_key IS NULL AND remembered IS NULL))
);
CREATE INDEX IF NOT EXISTS idx_hf_daily_word_event_actor
 ON homeflow_daily_word_events(actor_user_id,created_at);
CREATE TRIGGER IF NOT EXISTS trg_hf_daily_word_insert_owner
 BEFORE INSERT ON homeflow_daily_word_reviews
 WHEN NEW.homeflow_user_id<>NEW.updated_by_user_id OR NOT EXISTS(
  SELECT 1 FROM homeflow_identity_links l WHERE l.homeflow_user_id=NEW.homeflow_user_id AND l.state='active')
 BEGIN SELECT RAISE(ABORT,'DAILY_WORD_OWNER_REQUIRED'); END;
CREATE TRIGGER IF NOT EXISTS trg_hf_daily_word_insert_conflict
 BEFORE INSERT ON homeflow_daily_word_reviews
 WHEN EXISTS(SELECT 1 FROM homeflow_daily_word_reviews x
  WHERE x.homeflow_user_id=NEW.homeflow_user_id AND x.word_key=NEW.word_key AND (
   x.streak<>NEW.streak OR x.next_date<>NEW.next_date OR x.last_date<>NEW.last_date))
 BEGIN SELECT RAISE(ABORT,'DAILY_WORD_CONFLICT'); END;
CREATE TRIGGER IF NOT EXISTS trg_hf_daily_word_update_owner
 BEFORE UPDATE ON homeflow_daily_word_reviews
 WHEN NEW.homeflow_user_id<>OLD.homeflow_user_id OR NEW.word_key<>OLD.word_key OR
  NEW.updated_by_user_id<>OLD.homeflow_user_id OR NEW.version<>OLD.version+1 OR
  NOT EXISTS(SELECT 1 FROM homeflow_identity_links l
   WHERE l.homeflow_user_id=OLD.homeflow_user_id AND l.state='active')
 BEGIN SELECT RAISE(ABORT,'DAILY_WORD_INVALID_UPDATE'); END;
CREATE TRIGGER IF NOT EXISTS trg_hf_daily_word_no_delete
 BEFORE DELETE ON homeflow_daily_word_reviews
 BEGIN SELECT RAISE(ABORT,'DAILY_WORD_DELETE_FORBIDDEN'); END;
CREATE TRIGGER IF NOT EXISTS trg_hf_daily_word_event_no_update
 BEFORE UPDATE ON homeflow_daily_word_events
 BEGIN SELECT RAISE(ABORT,'IMMUTABLE_DAILY_WORD_AUDIT'); END;
CREATE TRIGGER IF NOT EXISTS trg_hf_daily_word_event_no_delete
 BEFORE DELETE ON homeflow_daily_word_events
 BEGIN SELECT RAISE(ABORT,'IMMUTABLE_DAILY_WORD_AUDIT'); END;
