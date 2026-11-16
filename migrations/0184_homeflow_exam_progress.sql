-- 0184: HomeFlow owner/member exercise and exam history isolation.
-- UNEXECUTED. Requires 0180. Old study_attempts, question_review_state,
-- exam_history and mock_exam_submissions are strictly read-only legacy data.
CREATE TABLE IF NOT EXISTS homeflow_study_attempts(
 homeflow_user_id TEXT NOT NULL REFERENCES homeflow_identity_links(homeflow_user_id) ON DELETE RESTRICT,
 id TEXT NOT NULL,
 question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE RESTRICT,
 user_answer_json TEXT NOT NULL CHECK(json_valid(user_answer_json)),
 is_correct INTEGER NOT NULL CHECK(is_correct IN(0,1)),
 duration_seconds INTEGER NOT NULL DEFAULT 0 CHECK(duration_seconds BETWEEN 0 AND 86400),
 answered_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY(homeflow_user_id,id)
);
CREATE INDEX IF NOT EXISTS idx_hf_study_attempts_wrong
 ON homeflow_study_attempts(homeflow_user_id,is_correct,question_id,answered_at DESC);
CREATE INDEX IF NOT EXISTS idx_hf_study_attempts_question
 ON homeflow_study_attempts(homeflow_user_id,question_id,answered_at DESC);

CREATE TABLE IF NOT EXISTS homeflow_question_review_state(
 homeflow_user_id TEXT NOT NULL REFERENCES homeflow_identity_links(homeflow_user_id) ON DELETE RESTRICT,
 question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE RESTRICT,
 track_id TEXT NOT NULL REFERENCES study_tracks(id) ON DELETE RESTRICT,
 review_count INTEGER NOT NULL DEFAULT 0 CHECK(review_count>=0),
 correct_streak INTEGER NOT NULL DEFAULT 0 CHECK(correct_streak>=0),
 last_result TEXT NOT NULL DEFAULT 'again' CHECK(last_result IN('again','remembered')),
 next_review_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 mastered INTEGER NOT NULL DEFAULT 0 CHECK(mastered IN(0,1)),
 version INTEGER NOT NULL DEFAULT 1 CHECK(version>=1),
 updated_by_user_id TEXT NOT NULL REFERENCES homeflow_identity_links(homeflow_user_id) ON DELETE RESTRICT,
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY(homeflow_user_id,question_id)
);
CREATE INDEX IF NOT EXISTS idx_hf_question_review_due
 ON homeflow_question_review_state(homeflow_user_id,track_id,mastered,next_review_at,question_id);

CREATE TABLE IF NOT EXISTS homeflow_exam_history(
 homeflow_user_id TEXT NOT NULL REFERENCES homeflow_identity_links(homeflow_user_id) ON DELETE RESTRICT,
 id TEXT NOT NULL,
 study_date TEXT NOT NULL CHECK(length(study_date)=10),
 exam_name TEXT NOT NULL CHECK(length(exam_name) BETWEEN 1 AND 100),
 question_count INTEGER NOT NULL CHECK(question_count BETWEEN 1 AND 10000),
 correct_count INTEGER NOT NULL CHECK(correct_count>=0 AND correct_count<=question_count),
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY(homeflow_user_id,id)
);
CREATE INDEX IF NOT EXISTS idx_hf_exam_history_date
 ON homeflow_exam_history(homeflow_user_id,study_date DESC,created_at DESC,id);

CREATE TABLE IF NOT EXISTS homeflow_exam_events(
 event_id TEXT PRIMARY KEY,
 actor_user_id TEXT NOT NULL REFERENCES homeflow_identity_links(homeflow_user_id) ON DELETE RESTRICT,
 action TEXT NOT NULL CHECK(action IN('attempt','history_added','mock_submitted',
    'legacy_attempts_adopted','legacy_reviews_adopted','legacy_history_adopted')),
 reference_sha256 TEXT CHECK(reference_sha256 IS NULL OR length(reference_sha256)=64),
 affected_count INTEGER NOT NULL CHECK(affected_count>=1),
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_hf_exam_events_user ON homeflow_exam_events(actor_user_id,created_at);
CREATE TRIGGER IF NOT EXISTS trg_hf_exam_events_no_update
 BEFORE UPDATE ON homeflow_exam_events BEGIN SELECT RAISE(ABORT,'IMMUTABLE_EXAM_AUDIT'); END;
CREATE TRIGGER IF NOT EXISTS trg_hf_exam_events_no_delete
 BEFORE DELETE ON homeflow_exam_events BEGIN SELECT RAISE(ABORT,'IMMUTABLE_EXAM_AUDIT'); END;

CREATE TRIGGER IF NOT EXISTS trg_hf_attempt_check_insert
 BEFORE INSERT ON homeflow_study_attempts
 WHEN NOT EXISTS(SELECT 1 FROM homeflow_identity_links WHERE homeflow_user_id=NEW.homeflow_user_id AND state='active')
 BEGIN SELECT RAISE(ABORT,'EXAM_OWNER_REQUIRED'); END;
CREATE TRIGGER IF NOT EXISTS trg_hf_review_check_insert
 BEFORE INSERT ON homeflow_question_review_state
 WHEN NEW.homeflow_user_id!=NEW.updated_by_user_id OR NOT EXISTS(
  SELECT 1 FROM homeflow_identity_links WHERE homeflow_user_id=NEW.homeflow_user_id AND state='active')
 BEGIN SELECT RAISE(ABORT,'EXAM_OWNER_REQUIRED'); END;
CREATE TRIGGER IF NOT EXISTS trg_hf_review_check_update
 BEFORE UPDATE ON homeflow_question_review_state
 WHEN OLD.homeflow_user_id!=NEW.homeflow_user_id OR NEW.updated_by_user_id!=NEW.homeflow_user_id
 BEGIN SELECT RAISE(ABORT,'EXAM_OWNER_REQUIRED'); END;
CREATE TRIGGER IF NOT EXISTS trg_hf_history_check_insert
 BEFORE INSERT ON homeflow_exam_history
 WHEN NOT EXISTS(SELECT 1 FROM homeflow_identity_links WHERE homeflow_user_id=NEW.homeflow_user_id AND state='active')
 BEGIN SELECT RAISE(ABORT,'EXAM_OWNER_REQUIRED'); END;
