-- SG A/B 题型分类。A/B 独立于知识领域 topic；保留分类依据，便于人工复核。
ALTER TABLE questions ADD COLUMN exam_section TEXT
  CHECK (exam_section IS NULL OR exam_section IN ('A', 'B'));
ALTER TABLE questions ADD COLUMN exam_section_method TEXT
  CHECK (exam_section_method IS NULL OR exam_section_method IN ('explicit', 'case_pattern', 'default_a', 'unclassified'));

-- 明确的来源/题型标签优先。不要仅因为出现“公司/担当者”等普通词就认定为科目 B。
UPDATE questions
SET exam_section = CASE
  WHEN lower(COALESCE(question_type, '') || ' ' || COALESCE(source_reference, '') || ' ' || COALESCE(prompt, ''))
       LIKE '%section_b%'
    OR lower(COALESCE(question_type, '') || ' ' || COALESCE(source_reference, '') || ' ' || COALESCE(prompt, ''))
       LIKE '%科目b%'
    OR lower(COALESCE(question_type, '') || ' ' || COALESCE(source_reference, '') || ' ' || COALESCE(prompt, ''))
       LIKE '%科目Ｂ%'
    OR lower(COALESCE(question_type, '') || ' ' || COALESCE(source_reference, '') || ' ' || COALESCE(prompt, ''))
       LIKE '%case_study%'
    OR lower(COALESCE(question_type, '') || ' ' || COALESCE(source_reference, ''))
       LIKE '%scenario%'
    THEN 'B'
  WHEN lower(COALESCE(question_type, '') || ' ' || COALESCE(source_reference, '') || ' ' || COALESCE(prompt, ''))
       LIKE '%section_a%'
    OR lower(COALESCE(question_type, '') || ' ' || COALESCE(source_reference, '') || ' ' || COALESCE(prompt, ''))
       LIKE '%科目a%'
    OR lower(COALESCE(question_type, '') || ' ' || COALESCE(source_reference, '') || ' ' || COALESCE(prompt, ''))
       LIKE '%科目Ａ%'
    THEN 'A'
  WHEN lower(COALESCE(question_type, '') || ' ' || COALESCE(source_reference, '') || ' ' || COALESCE(prompt, ''))
       LIKE '%ケーススタディ%'
    OR lower(COALESCE(question_type, '') || ' ' || COALESCE(source_reference, '') || ' ' || COALESCE(prompt, ''))
       LIKE '%事例問題%'
    OR lower(COALESCE(prompt, '')) LIKE '%次の状況%'
    OR lower(COALESCE(prompt, '')) LIKE '%次の事例%'
    OR lower(COALESCE(prompt, '')) LIKE '%以下の状況%'
    OR lower(COALESCE(prompt, '')) LIKE '%以下の事例%'
    OR lower(COALESCE(prompt, '')) LIKE '%状況を読んで%'
    OR lower(COALESCE(prompt, '')) LIKE '%事例を読んで%'
    OR lower(COALESCE(prompt, '')) LIKE '%ケーススタディ%'
    OR lower(COALESCE(prompt, '')) LIKE '%ケースを読んで%'
    OR lower(COALESCE(prompt, '')) LIKE '%次の文章を読んで%'
    OR lower(COALESCE(prompt, '')) LIKE '%次のメールを読んで%'
    THEN 'B'
  WHEN length(COALESCE(prompt, '')) > 1200 THEN NULL
  ELSE 'A'
END,
exam_section_method = CASE
  WHEN lower(COALESCE(question_type, '') || ' ' || COALESCE(source_reference, '') || ' ' || COALESCE(prompt, ''))
       LIKE '%section_b%'
    OR lower(COALESCE(question_type, '') || ' ' || COALESCE(source_reference, '') || ' ' || COALESCE(prompt, ''))
       LIKE '%科目b%'
    OR lower(COALESCE(question_type, '') || ' ' || COALESCE(source_reference, '') || ' ' || COALESCE(prompt, ''))
       LIKE '%科目Ｂ%'
    OR lower(COALESCE(question_type, '') || ' ' || COALESCE(source_reference, '') || ' ' || COALESCE(prompt, ''))
       LIKE '%case_study%'
    OR lower(COALESCE(question_type, '') || ' ' || COALESCE(source_reference, ''))
       LIKE '%scenario%'
    OR lower(COALESCE(question_type, '') || ' ' || COALESCE(source_reference, '') || ' ' || COALESCE(prompt, ''))
       LIKE '%section_a%'
    OR lower(COALESCE(question_type, '') || ' ' || COALESCE(source_reference, '') || ' ' || COALESCE(prompt, ''))
       LIKE '%科目a%'
    OR lower(COALESCE(question_type, '') || ' ' || COALESCE(source_reference, '') || ' ' || COALESCE(prompt, ''))
       LIKE '%科目Ａ%'
    THEN 'explicit'
  WHEN lower(COALESCE(question_type, '') || ' ' || COALESCE(source_reference, '') || ' ' || COALESCE(prompt, ''))
       LIKE '%ケーススタディ%'
    OR lower(COALESCE(question_type, '') || ' ' || COALESCE(source_reference, '') || ' ' || COALESCE(prompt, ''))
       LIKE '%事例問題%'
    OR lower(COALESCE(prompt, '')) LIKE '%次の状況%'
    OR lower(COALESCE(prompt, '')) LIKE '%次の事例%'
    OR lower(COALESCE(prompt, '')) LIKE '%以下の状況%'
    OR lower(COALESCE(prompt, '')) LIKE '%以下の事例%'
    OR lower(COALESCE(prompt, '')) LIKE '%状況を読んで%'
    OR lower(COALESCE(prompt, '')) LIKE '%事例を読んで%'
    OR lower(COALESCE(prompt, '')) LIKE '%ケーススタディ%'
    OR lower(COALESCE(prompt, '')) LIKE '%ケースを読んで%'
    OR lower(COALESCE(prompt, '')) LIKE '%次の文章を読んで%'
    OR lower(COALESCE(prompt, '')) LIKE '%次のメールを読んで%'
    THEN 'case_pattern'
  WHEN length(COALESCE(prompt, '')) > 1200 THEN 'unclassified'
  ELSE 'default_a'
END
WHERE track_id = 'exam-sg';
