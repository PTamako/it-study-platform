-- Unexecuted Draft: journal for a future verified document-sync executor.
-- No route or deployment is enabled by this migration.
CREATE TABLE IF NOT EXISTS homeflow_document_study_receipts (
 approval_id TEXT PRIMARY KEY NOT NULL CHECK(length(approval_id)=36),
 candidate_id TEXT NOT NULL UNIQUE CHECK(length(candidate_id)=32),
 household_id TEXT NOT NULL,
 requester_user_id TEXT NOT NULL REFERENCES homeflow_identity_links(homeflow_user_id) ON DELETE RESTRICT,
 payload_sha256 TEXT NOT NULL CHECK(length(payload_sha256)=64),
 kind TEXT NOT NULL CHECK(kind IN ('sentence','vocabulary')),
 remote_id TEXT NOT NULL,
 effect TEXT NOT NULL CHECK(effect IN ('created','already_present')),
 applied_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_hf_document_study_actor
 ON homeflow_document_study_receipts(requester_user_id,applied_at DESC);
CREATE TRIGGER IF NOT EXISTS trg_hf_document_receipt_no_update
 BEFORE UPDATE ON homeflow_document_study_receipts
 BEGIN SELECT RAISE(ABORT,'DOCUMENT_STUDY_RECEIPT_IMMUTABLE'); END;
CREATE TRIGGER IF NOT EXISTS trg_hf_document_receipt_no_delete
 BEFORE DELETE ON homeflow_document_study_receipts
 BEGIN SELECT RAISE(ABORT,'DOCUMENT_STUDY_RECEIPT_IMMUTABLE'); END;
