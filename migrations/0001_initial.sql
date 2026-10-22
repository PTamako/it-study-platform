PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS study_tracks (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('exam', 'language', 'dictionary')),
  title TEXT NOT NULL,
  subtitle TEXT NOT NULL DEFAULT '',
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS questions (
  id TEXT PRIMARY KEY,
  track_id TEXT NOT NULL,
  topic TEXT NOT NULL,
  difficulty TEXT NOT NULL DEFAULT 'standard',
  question_type TEXT NOT NULL DEFAULT 'single_choice',
  prompt TEXT NOT NULL,
  options_json TEXT NOT NULL DEFAULT '[]',
  answer_json TEXT NOT NULL,
  explanation TEXT NOT NULL DEFAULT '',
  source_type TEXT NOT NULL CHECK (source_type IN ('official', 'licensed', 'generated', 'personal')),
  source_reference TEXT,
  language TEXT NOT NULL DEFAULT 'ja',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (track_id) REFERENCES study_tracks(id)
);

CREATE TABLE IF NOT EXISTS study_attempts (
  id TEXT PRIMARY KEY,
  question_id TEXT NOT NULL,
  user_answer_json TEXT NOT NULL,
  is_correct INTEGER NOT NULL CHECK (is_correct IN (0, 1)),
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  answered_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (question_id) REFERENCES questions(id)
);

CREATE TABLE IF NOT EXISTS vocabulary (
  id TEXT PRIMARY KEY,
  term TEXT NOT NULL,
  language TEXT NOT NULL,
  reading TEXT,
  meaning_zh TEXT NOT NULL DEFAULT '',
  meaning_ja TEXT NOT NULL DEFAULT '',
  meaning_en TEXT NOT NULL DEFAULT '',
  example TEXT NOT NULL DEFAULT '',
  source_module TEXT NOT NULL DEFAULT 'dictionary',
  mastery INTEGER NOT NULL DEFAULT 0 CHECK (mastery BETWEEN 0 AND 5),
  next_review_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS vocabulary_relations (
  vocabulary_id TEXT NOT NULL,
  track_id TEXT NOT NULL,
  topic TEXT,
  PRIMARY KEY (vocabulary_id, track_id),
  FOREIGN KEY (vocabulary_id) REFERENCES vocabulary(id) ON DELETE CASCADE,
  FOREIGN KEY (track_id) REFERENCES study_tracks(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_questions_track_topic ON questions(track_id, topic);
CREATE INDEX IF NOT EXISTS idx_attempts_question_date ON study_attempts(question_id, answered_at);
CREATE INDEX IF NOT EXISTS idx_vocabulary_review ON vocabulary(next_review_at);

-- 初始化常用学习模块；这些是模块目录，不是虚构的考试题目。
INSERT OR IGNORE INTO study_tracks (id, kind, title, subtitle) VALUES
  ('exam-sg', 'exam', '信息安全管理考试（SG）', '情報セキュリティマネジメント試験'),
  ('exam-fe', 'exam', '基本信息技术者考试（FE）', '基本情報技術者試験'),
  ('exam-ap', 'exam', '应用信息技术者考试（AP）', '応用情報技術者試験'),
  ('language-ja', 'language', '日语学习', '日常会话、职场表达、词汇语法、听说读写'),
  ('language-en', 'language', '英语学习', '日常会话、职场表达、词汇语法、听说读写'),
  ('dictionary-it', 'dictionary', '多语言词典与 IT 术语', '中文、日语、英语词条与专业术语');
