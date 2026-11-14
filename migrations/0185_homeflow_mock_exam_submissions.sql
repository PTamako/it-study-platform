-- 0185: immutable per-HomeFlow-user simulated exam receipts.
-- UNEXECUTED. Depends on 0180 and 0184. Never modify/drop existing
-- mock_exam_submissions, study_attempts or exam_history.
CREATE TABLE IF NOT EXISTS homeflow_mock_exam_submissions(
 homeflow_user_id TEXT NOT NULL REFERENCES homeflow_identity_links(homeflow_user_id) ON DELETE RESTRICT,
 id TEXT NOT NULL,
 track_id TEXT NOT NULL CHECK(track_id IN('exam-sg','exam-fe')),
 exam_section TEXT NOT NULL CHECK(exam_section IN('SG','A','B')),
 study_date TEXT NOT NULL CHECK(length(study_date)=10),
 payload_json TEXT NOT NULL CHECK(json_valid(payload_json)),
 result_json TEXT NOT NULL CHECK(json_valid(result_json)),
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY(homeflow_user_id,id)
);
CREATE INDEX IF NOT EXISTS idx_hf_mock_exam_created
 ON homeflow_mock_exam_submissions(homeflow_user_id,created_at DESC,id);
CREATE TRIGGER IF NOT EXISTS trg_hf_mock_insert_active
 BEFORE INSERT ON homeflow_mock_exam_submissions
 WHEN NOT EXISTS(SELECT 1 FROM homeflow_identity_links l
  WHERE l.homeflow_user_id=NEW.homeflow_user_id AND l.state='active')
 BEGIN SELECT RAISE(ABORT,'MOCK_OWNER_REQUIRED'); END;
CREATE TRIGGER IF NOT EXISTS trg_hf_mock_immutable_update
 BEFORE UPDATE ON homeflow_mock_exam_submissions
 BEGIN SELECT RAISE(ABORT,'IMMUTABLE_MOCK_RECEIPT'); END;
CREATE TRIGGER IF NOT EXISTS trg_hf_mock_immutable_delete
 BEFORE DELETE ON homeflow_mock_exam_submissions
 BEGIN SELECT RAISE(ABORT,'IMMUTABLE_MOCK_RECEIPT'); END;
