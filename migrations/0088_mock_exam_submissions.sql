-- Idempotent, atomic SG/FE mock exam submissions.
-- A submission ID has one immutable payload and one stored result.
-- Never delete this table during migrations: it prevents duplicate grading.
CREATE TABLE IF NOT EXISTS mock_exam_submissions (
  id TEXT PRIMARY KEY,
  track_id TEXT NOT NULL CHECK (track_id IN ('exam-sg','exam-fe')),
  exam_section TEXT NOT NULL CHECK (exam_section IN ('SG','A','B')),
  payload_json TEXT NOT NULL,
  result_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_mock_exam_submissions_created ON mock_exam_submissions(created_at);
