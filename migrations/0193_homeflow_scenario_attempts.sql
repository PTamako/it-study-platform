-- User-scoped practical scenario attempts for the original Zhixue practice module.
-- Additive: all legacy scenario_attempts remain unchanged, and a household
-- member never reads or claims legacy rows. All writes require verified actor.
CREATE TABLE IF NOT EXISTS homeflow_scenario_attempts (
  homeflow_user_id TEXT NOT NULL REFERENCES homeflow_identity_links(homeflow_user_id) ON DELETE RESTRICT,
  id TEXT NOT NULL,
  scenario_id TEXT NOT NULL REFERENCES practical_scenarios(id) ON DELETE RESTRICT,
  track_id TEXT NOT NULL CHECK(track_id IN ('exam-sg','exam-fe')),
  selected_option TEXT NOT NULL,
  score INTEGER NOT NULL CHECK(score BETWEEN 0 AND 100),
  feedback TEXT NOT NULL DEFAULT '',
  duration_seconds INTEGER NOT NULL DEFAULT 0 CHECK(duration_seconds BETWEEN 0 AND 86400),
  answered_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(homeflow_user_id,id)
);
CREATE INDEX IF NOT EXISTS idx_hf_scenario_attempts_user
  ON homeflow_scenario_attempts(homeflow_user_id,track_id,answered_at DESC);
CREATE TRIGGER IF NOT EXISTS trg_hf_scenario_insert_active
 BEFORE INSERT ON homeflow_scenario_attempts
 WHEN NOT EXISTS(SELECT 1 FROM homeflow_identity_links
  WHERE homeflow_user_id=NEW.homeflow_user_id AND state='active')
 BEGIN SELECT RAISE(ABORT,'SCENARIO_OWNER_REQUIRED'); END;
CREATE TRIGGER IF NOT EXISTS trg_hf_scenario_immutable_update
 BEFORE UPDATE ON homeflow_scenario_attempts
 BEGIN SELECT RAISE(ABORT,'IMMUTABLE_PERSONAL_SCENARIO_ATTEMPT'); END;
CREATE TRIGGER IF NOT EXISTS trg_hf_scenario_immutable_delete
 BEFORE DELETE ON homeflow_scenario_attempts
 BEGIN SELECT RAISE(ABORT,'IMMUTABLE_PERSONAL_SCENARIO_ATTEMPT'); END;
