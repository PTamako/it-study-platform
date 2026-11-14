-- 0183 Stage E: per-HomeFlow-user sentence-card mastery and spaced reviews.
-- UNEXECUTED. Requires 0180. Never modify the legacy language_card_progress
-- or language_card_reviews tables: original owner will explicitly adopt them.
-- Both spouses can review the same public lesson without sharing progress.
CREATE TABLE IF NOT EXISTS homeflow_language_mastery (
  homeflow_user_id TEXT NOT NULL REFERENCES homeflow_identity_links(homeflow_user_id) ON DELETE RESTRICT,
  card_id TEXT NOT NULL REFERENCES language_cards(id) ON DELETE RESTRICT,
  mastered INTEGER NOT NULL CHECK(mastered IN (0,1)),
  version INTEGER NOT NULL DEFAULT 1 CHECK(version >= 1),
  updated_by_user_id TEXT NOT NULL REFERENCES homeflow_identity_links(homeflow_user_id) ON DELETE RESTRICT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(homeflow_user_id, card_id)
);
CREATE TABLE IF NOT EXISTS homeflow_language_reviews (
  homeflow_user_id TEXT NOT NULL REFERENCES homeflow_identity_links(homeflow_user_id) ON DELETE RESTRICT,
  card_id TEXT NOT NULL REFERENCES language_cards(id) ON DELETE RESTRICT,
  review_count INTEGER NOT NULL DEFAULT 0 CHECK(review_count >= 0),
  correct_streak INTEGER NOT NULL DEFAULT 0 CHECK(correct_streak >= 0),
  next_review_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_reviewed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_result TEXT NOT NULL CHECK(last_result IN ('again','remembered')),
  last_grade TEXT NOT NULL CHECK(last_grade IN ('again','hard','remembered')),
  version INTEGER NOT NULL DEFAULT 1 CHECK(version >= 1),
  updated_by_user_id TEXT NOT NULL REFERENCES homeflow_identity_links(homeflow_user_id) ON DELETE RESTRICT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(homeflow_user_id,card_id)
);
CREATE INDEX IF NOT EXISTS idx_hf_language_reviews_due
  ON homeflow_language_reviews(homeflow_user_id,next_review_at,card_id);
CREATE INDEX IF NOT EXISTS idx_hf_language_cards_catalog
  ON language_cards(language,content_type,id);

-- No card text/answer or private content in this append-only event ledger.
-- request_hash enforces exactly-once grade actions under network retries.
CREATE TABLE IF NOT EXISTS homeflow_language_events (
  event_id TEXT PRIMARY KEY,
  actor_user_id TEXT NOT NULL REFERENCES homeflow_identity_links(homeflow_user_id) ON DELETE RESTRICT,
  action TEXT NOT NULL CHECK(action IN ('mastered','unmastered','graded',
    'legacy_mastery_adopted','legacy_reviews_adopted')),
  resource_sha256 TEXT CHECK(resource_sha256 IS NULL OR length(resource_sha256)=64),
  request_hash TEXT CHECK(request_hash IS NULL OR length(request_hash)=64),
  payload_hash TEXT CHECK(payload_hash IS NULL OR length(payload_hash)=64),
  affected_count INTEGER NOT NULL DEFAULT 1 CHECK(affected_count>=1),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(actor_user_id,request_hash)
);
CREATE INDEX IF NOT EXISTS idx_hf_language_events_actor
  ON homeflow_language_events(actor_user_id,created_at);
CREATE TRIGGER IF NOT EXISTS trg_hf_language_event_immutable_update
 BEFORE UPDATE ON homeflow_language_events
 BEGIN SELECT RAISE(ABORT,'IMMUTABLE_LANGUAGE_AUDIT'); END;
CREATE TRIGGER IF NOT EXISTS trg_hf_language_event_immutable_delete
 BEFORE DELETE ON homeflow_language_events
 BEGIN SELECT RAISE(ABORT,'IMMUTABLE_LANGUAGE_AUDIT'); END;

CREATE TRIGGER IF NOT EXISTS trg_hf_language_mastery_actor_insert
 BEFORE INSERT ON homeflow_language_mastery
 WHEN NEW.homeflow_user_id!=NEW.updated_by_user_id OR
  NOT EXISTS(SELECT 1 FROM homeflow_identity_links l
   WHERE l.homeflow_user_id=NEW.homeflow_user_id AND l.state='active')
 BEGIN SELECT RAISE(ABORT,'LANGUAGE_OWNER_REQUIRED'); END;
CREATE TRIGGER IF NOT EXISTS trg_hf_language_mastery_actor_update
 BEFORE UPDATE ON homeflow_language_mastery
 WHEN NEW.homeflow_user_id!=OLD.homeflow_user_id OR
  NEW.updated_by_user_id!=NEW.homeflow_user_id
 BEGIN SELECT RAISE(ABORT,'LANGUAGE_OWNER_REQUIRED'); END;
CREATE TRIGGER IF NOT EXISTS trg_hf_language_review_actor_insert
 BEFORE INSERT ON homeflow_language_reviews
 WHEN NEW.homeflow_user_id!=NEW.updated_by_user_id OR
  NOT EXISTS(SELECT 1 FROM homeflow_identity_links l
   WHERE l.homeflow_user_id=NEW.homeflow_user_id AND l.state='active')
 BEGIN SELECT RAISE(ABORT,'LANGUAGE_OWNER_REQUIRED'); END;
CREATE TRIGGER IF NOT EXISTS trg_hf_language_review_actor_update
 BEFORE UPDATE ON homeflow_language_reviews
 WHEN NEW.homeflow_user_id!=OLD.homeflow_user_id OR
  NEW.updated_by_user_id!=NEW.homeflow_user_id
 BEGIN SELECT RAISE(ABORT,'LANGUAGE_OWNER_REQUIRED'); END;
