-- Catalog for official/authorized question sets. This stores source metadata and links,
-- not copied question text. Add full question content only after reuse terms are verified.
CREATE TABLE IF NOT EXISTS question_sources (
  id TEXT PRIMARY KEY,
  exam_code TEXT NOT NULL,
  year_label TEXT NOT NULL,
  subject_label TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL,
  source_url TEXT NOT NULL,
  content_mode TEXT NOT NULL DEFAULT 'link_only'
    CHECK (content_mode IN ('link_only', 'licensed', 'full_text')),
  license_note TEXT NOT NULL DEFAULT '',
  checked_at TEXT,
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (exam_code, year_label, subject_label)
);

CREATE INDEX IF NOT EXISTS idx_question_sources_exam_year
  ON question_sources(exam_code, year_label);

-- IPA official landing page for SG/FE published questions and answer examples.
-- Keep as link-only until the exact reuse conditions for each set are verified.
INSERT OR IGNORE INTO question_sources
  (id, exam_code, year_label, subject_label, title, source_url, content_mode, license_note, notes)
VALUES
  ('sg-ipa-public-index', 'SG', '2023-2026', '科目A・科目B',
   'IPA 情報セキュリティマネジメント試験 公開問題・解答例',
   'https://www.ipa.go.jp/shiken/mondai-kaiotu/sg_fe/koukai/index.html',
   'link_only',
   '题目正文、图表和答案例导入前须核对 IPA 当期公开的利用条件；当前仅保存官方链接。',
   '年度及题数应从官方页面逐套核实，不以第三方网站统计代替官方记录。');
