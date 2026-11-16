-- P0-3 Draft, UNEXECUTED. The actual HomeFlow approver must remain
-- separate from requester and is audited in the exact target D1 transaction.
CREATE TABLE IF NOT EXISTS homeflow_document_study_approval_audit (
 approval_id TEXT PRIMARY KEY NOT NULL REFERENCES homeflow_document_study_receipts(approval_id)
  ON DELETE RESTRICT,
 candidate_id TEXT NOT NULL,
 household_id TEXT NOT NULL,
 requester_user_id TEXT NOT NULL REFERENCES homeflow_identity_links(homeflow_user_id)
  ON DELETE RESTRICT,
 approver_user_id TEXT NOT NULL REFERENCES homeflow_identity_links(homeflow_user_id)
  ON DELETE RESTRICT,
 applied_at INTEGER NOT NULL CHECK(applied_at>0),
 CHECK(requester_user_id<>approver_user_id)
);
CREATE INDEX IF NOT EXISTS idx_hf_doc_study_approver_time
 ON homeflow_document_study_approval_audit(approver_user_id,applied_at DESC);
CREATE TRIGGER IF NOT EXISTS trg_hf_doc_study_audit_valid
 BEFORE INSERT ON homeflow_document_study_approval_audit
 WHEN NOT EXISTS (
  SELECT 1 FROM homeflow_document_study_receipts r
  JOIN homeflow_identity_links member ON member.homeflow_user_id=r.requester_user_id
  JOIN homeflow_identity_links approver ON approver.homeflow_user_id=NEW.approver_user_id
  WHERE r.approval_id=NEW.approval_id AND r.candidate_id=NEW.candidate_id
   AND r.household_id=NEW.household_id
   AND r.requester_user_id=NEW.requester_user_id
   AND r.applied_at=NEW.applied_at
   AND member.role='member' AND member.state='active'
   AND approver.role='owner' AND approver.state='active'
   AND approver.homeflow_household_id=NEW.household_id
 ) BEGIN SELECT RAISE(ABORT,'STUDY_APPROVER_AUDIT_INVALID'); END;
CREATE TRIGGER IF NOT EXISTS trg_hf_doc_study_audit_immutable_update
 BEFORE UPDATE ON homeflow_document_study_approval_audit
 BEGIN SELECT RAISE(ABORT,'STUDY_APPROVER_AUDIT_IMMUTABLE'); END;
CREATE TRIGGER IF NOT EXISTS trg_hf_doc_study_audit_immutable_delete
 BEFORE DELETE ON homeflow_document_study_approval_audit
 BEGIN SELECT RAISE(ABORT,'STUDY_APPROVER_AUDIT_IMMUTABLE'); END;
