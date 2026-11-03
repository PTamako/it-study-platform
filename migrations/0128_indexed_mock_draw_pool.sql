-- FE/SG timed mocks: indexed, bounded reads instead of downloading every question.
-- Additive: neither existing questions nor learning attempts/reviews are modified.
-- A one-time, deterministic per-row draw ticket is persisted for efficient random seeks.
CREATE TABLE IF NOT EXISTS mock_question_pool (
  question_id TEXT PRIMARY KEY REFERENCES questions(id) ON DELETE CASCADE,
  track_id TEXT NOT NULL,
  exam_section TEXT NOT NULL DEFAULT '',
  exam_section_method TEXT NOT NULL DEFAULT '',
  topic TEXT NOT NULL DEFAULT '',
  source_type TEXT NOT NULL,
  question_kind TEXT NOT NULL DEFAULT 'standard',
  exam_origin TEXT NOT NULL DEFAULT 'general',
  draw_key INTEGER NOT NULL CHECK (draw_key BETWEEN 0 AND 2147483647)
);
CREATE INDEX IF NOT EXISTS idx_mock_pool_section_draw
  ON mock_question_pool(track_id, exam_section, draw_key, question_id);
CREATE INDEX IF NOT EXISTS idx_mock_pool_topic_draw
  ON mock_question_pool(track_id, exam_section, exam_section_method, topic, draw_key, question_id);

-- Only two exam tracks need draw slots; no other records/history are touched.
INSERT OR IGNORE INTO mock_question_pool
  (question_id, track_id, exam_section, exam_section_method, topic,
   source_type, question_kind, exam_origin, draw_key)
SELECT id, track_id, COALESCE(exam_section, ''), COALESCE(exam_section_method, ''),
       topic, source_type, COALESCE(question_kind, 'standard'),
       COALESCE(exam_origin, 'general'), (random() & 2147483647)
FROM questions
WHERE track_id IN ('exam-fe', 'exam-sg');

-- Existing and future importers only INSERT into questions; keep the compact index
-- synchronized automatically, including future FE additions. One extra indexed row
-- per new question is preferable to scanning thousands of full question payloads.
CREATE TRIGGER IF NOT EXISTS trg_mock_pool_question_insert
AFTER INSERT ON questions
WHEN NEW.track_id IN ('exam-fe', 'exam-sg')
BEGIN
  INSERT OR IGNORE INTO mock_question_pool
    (question_id, track_id, exam_section, exam_section_method, topic,
     source_type, question_kind, exam_origin, draw_key)
  VALUES (NEW.id, NEW.track_id, COALESCE(NEW.exam_section, ''),
          COALESCE(NEW.exam_section_method, ''), COALESCE(NEW.topic, ''),
          NEW.source_type, COALESCE(NEW.question_kind, 'standard'),
          COALESCE(NEW.exam_origin, 'general'), (random() & 2147483647));
END;

CREATE TRIGGER IF NOT EXISTS trg_mock_pool_question_update
AFTER UPDATE OF track_id, exam_section, exam_section_method, topic,
                source_type, question_kind, exam_origin ON questions
BEGIN
  DELETE FROM mock_question_pool
  WHERE question_id = NEW.id AND NEW.track_id NOT IN ('exam-fe', 'exam-sg');
  INSERT INTO mock_question_pool
    (question_id, track_id, exam_section, exam_section_method, topic,
     source_type, question_kind, exam_origin, draw_key)
  SELECT NEW.id, NEW.track_id, COALESCE(NEW.exam_section, ''),
         COALESCE(NEW.exam_section_method, ''), COALESCE(NEW.topic, ''),
         NEW.source_type, COALESCE(NEW.question_kind, 'standard'),
         COALESCE(NEW.exam_origin, 'general'), (random() & 2147483647)
  WHERE NEW.track_id IN ('exam-fe', 'exam-sg')
  ON CONFLICT(question_id) DO UPDATE SET
    track_id=excluded.track_id,
    exam_section=excluded.exam_section,
    exam_section_method=excluded.exam_section_method,
    topic=excluded.topic,
    source_type=excluded.source_type,
    question_kind=excluded.question_kind,
    exam_origin=excluded.exam_origin;
END;

CREATE TRIGGER IF NOT EXISTS trg_mock_pool_question_delete
AFTER DELETE ON questions
BEGIN
  DELETE FROM mock_question_pool WHERE question_id = OLD.id;
END;
