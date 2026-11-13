-- 0186: immutable audit of explicit legacy mock receipt adoption.
-- UNEXECUTED. Requires 0180 and 0185. Existing receipts and exam scores stay
-- untouched. This separate ledger avoids rewriting 0184's immutable event CHECK.
CREATE TABLE IF NOT EXISTS homeflow_mock_legacy_adoptions (
 event_id TEXT PRIMARY KEY NOT NULL,
 actor_user_id TEXT NOT NULL REFERENCES homeflow_identity_links(homeflow_user_id) ON DELETE RESTRICT,
 original_submission_id TEXT NOT NULL,
 payload_sha256 TEXT NOT NULL CHECK(length(payload_sha256)=64),
 result_sha256 TEXT NOT NULL CHECK(length(result_sha256)=64),
 copied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE(actor_user_id,original_submission_id),
 FOREIGN KEY(actor_user_id,original_submission_id)
  REFERENCES homeflow_mock_exam_submissions(homeflow_user_id,id) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS idx_hf_mock_adoptions_actor
 ON homeflow_mock_legacy_adoptions(actor_user_id,copied_at);
CREATE TRIGGER IF NOT EXISTS trg_hf_mock_adoption_immutable_update
 BEFORE UPDATE ON homeflow_mock_legacy_adoptions
 BEGIN SELECT RAISE(ABORT,'IMMUTABLE_MOCK_ADOPTION_AUDIT'); END;
CREATE TRIGGER IF NOT EXISTS trg_hf_mock_adoption_immutable_delete
 BEFORE DELETE ON homeflow_mock_legacy_adoptions
 BEGIN SELECT RAISE(ABORT,'IMMUTABLE_MOCK_ADOPTION_AUDIT'); END;
