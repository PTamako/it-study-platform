-- 0182 Stage E HomeFlow personal daily task completions (UNEXECUTED).
-- Requires 0180 verified identity. Historical daily_task_completions is
-- owner-only legacy source: NEVER rewrite, repartition, drop, or delete it.
-- The member's independent space starts empty, even on same day/task IDs.
CREATE TABLE IF NOT EXISTS homeflow_daily_task_progress (
  homeflow_user_id TEXT NOT NULL REFERENCES homeflow_identity_links(homeflow_user_id)
    ON DELETE RESTRICT,
  task_id TEXT NOT NULL CHECK(length(task_id) BETWEEN 1 AND 160),
  study_date TEXT NOT NULL CHECK(length(study_date)=10),
  completed INTEGER NOT NULL CHECK(completed IN (0,1)),
  version INTEGER NOT NULL DEFAULT 1 CHECK(version>=1),
  updated_by_user_id TEXT NOT NULL REFERENCES homeflow_identity_links(homeflow_user_id)
    ON DELETE RESTRICT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(homeflow_user_id,study_date,task_id)
);
CREATE INDEX IF NOT EXISTS idx_hf_daily_user_date
 ON homeflow_daily_task_progress(homeflow_user_id,study_date,completed,task_id);

CREATE TABLE IF NOT EXISTS homeflow_daily_task_events (
  event_id TEXT PRIMARY KEY NOT NULL,
  actor_user_id TEXT NOT NULL REFERENCES homeflow_identity_links(homeflow_user_id),
  action TEXT NOT NULL CHECK(action IN ('legacy_adopted','completed','reopened')),
  resource_sha256 TEXT CHECK(resource_sha256 IS NULL OR length(resource_sha256)=64),
  affected_count INTEGER NOT NULL DEFAULT 1 CHECK(affected_count>=1),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_hf_daily_events_actor
 ON homeflow_daily_task_events(actor_user_id,created_at);
CREATE TRIGGER IF NOT EXISTS trg_hf_daily_audit_immutable_update
 BEFORE UPDATE ON homeflow_daily_task_events
 BEGIN SELECT RAISE(ABORT,'IMMUTABLE_DAILY_AUDIT'); END;
CREATE TRIGGER IF NOT EXISTS trg_hf_daily_audit_immutable_delete
 BEFORE DELETE ON homeflow_daily_task_events
 BEGIN SELECT RAISE(ABORT,'IMMUTABLE_DAILY_AUDIT'); END;

CREATE TRIGGER IF NOT EXISTS trg_hf_daily_actor_insert
 BEFORE INSERT ON homeflow_daily_task_progress
 WHEN NEW.homeflow_user_id!=NEW.updated_by_user_id
   OR NOT EXISTS(SELECT 1 FROM homeflow_identity_links l
    WHERE l.homeflow_user_id=NEW.homeflow_user_id AND l.state='active')
 BEGIN SELECT RAISE(ABORT,'DAILY_OWNER_REQUIRED'); END;
CREATE TRIGGER IF NOT EXISTS trg_hf_daily_actor_update
 BEFORE UPDATE ON homeflow_daily_task_progress
 WHEN NEW.homeflow_user_id!=OLD.homeflow_user_id
   OR NEW.updated_by_user_id!=NEW.homeflow_user_id
 BEGIN SELECT RAISE(ABORT,'DAILY_OWNER_REQUIRED'); END;
