-- Register known IPA SG public-question sets as link-only catalog entries.
-- The catalog is not a mirror of the PDFs; it keeps the official source and metadata.
INSERT OR IGNORE INTO question_sources
  (id, exam_code, year_label, subject_label, title, source_url, content_mode, license_note, notes)
VALUES
  ('sg-ipa-2025', 'SG', '2025年度（令和7年度）', '科目A・B',
   'IPA SG 2025年度 公開問題・解答例',
   'https://www.ipa.go.jp/shiken/mondai-kaiotu/sg_fe/koukai/2025r07.html',
   'link_only', '官方允许使用过去问，但须遵守 IPA 的使用注意事项；平台暂不镜像题册。',
   '官方页面说明仅公开实际 CBT 试题的一部分。'),
  ('sg-ipa-2024', 'SG', '2024年度（令和6年度）', '科目A・B',
   'IPA SG 2024年度 公開問題・解答例',
   'https://www.ipa.go.jp/shiken/mondai-kaiotu/sg_fe/koukai/2024r06.html',
   'link_only', '官方允许使用过去问，但须遵守 IPA 的使用注意事项；平台暂不镜像题册。',
   '官方页面说明仅公开实际 CBT 试题的一部分。'),
  ('sg-ipa-index', 'SG', '2023年度以降', '科目A・B',
   'IPA SG 公开题目录（2023年度起）',
   'https://www.ipa.go.jp/shiken/mondai-kaiotu/',
   'link_only', '各年度题文使用前须遵守 IPA 的使用注意事项。',
   'IPA 表示令和5年度起公开 SG/FE 的部分 CBT 题目；令和2至4年度 SG 题目未公开。');
