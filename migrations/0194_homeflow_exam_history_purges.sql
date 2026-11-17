-- 0194: Record destructive per-actor exam-history purges without touching
-- immutable study attempts, review progress, legacy owner history or other users.
-- Additive and safe to replay. A successful DELETE and its audit event are batched.
CREATE TABLE IF NOT EXISTS homeflow_exam_history_purges(
 purge_id TEXT PRIMARY KEY,
 actor_user_id TEXT NOT NULL REFERENCES homeflow_identity_links(homeflow_user_id) ON DELETE RESTRICT,
 affected_count INTEGER NOT NULL CHECK(affected_count>=1),
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_hf_exam_history_purges_user
 ON homeflow_exam_history_purges(actor_user_id,created_at);
CREATE TRIGGER IF NOT EXISTS trg_hf_exam_history_purges_no_update
 BEFORE UPDATE ON homeflow_exam_history_purges
 BEGIN SELECT RAISE(ABORT,'IMMUTABLE_HISTORY_PURGE_AUDIT'); END;
CREATE TRIGGER IF NOT EXISTS trg_hf_exam_history_purges_no_delete
 BEFORE DELETE ON homeflow_exam_history_purges
 BEGIN SELECT RAISE(ABORT,'IMMUTABLE_HISTORY_PURGE_AUDIT'); END;
