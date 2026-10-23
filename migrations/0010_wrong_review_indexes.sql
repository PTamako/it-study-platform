-- 错题复习查询索引：按题目、是否答对与答题时间快速汇总。
-- 不改变现有数据；可与其余迁移一起在有条件时统一应用。
CREATE INDEX IF NOT EXISTS idx_study_attempts_question_correct_date
  ON study_attempts(question_id, is_correct, answered_at DESC);

CREATE INDEX IF NOT EXISTS idx_questions_track_id
  ON questions(track_id, id);
