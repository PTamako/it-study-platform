-- Correct A/B classification for verified IPA SG case-study questions.
-- The compact database prompts omit much of the shared case narrative, so the
-- original keyword/length-only rule in migration 0071 did not recognize these.
-- In the IPA public papers for FY2023–FY2026, questions 13–15 are case-based
-- practical questions. Keep this evidence-based list scoped to official SG items.
UPDATE questions
SET exam_section = 'B',
    exam_section_method = 'case_pattern'
WHERE track_id = 'exam-sg'
  AND source_type = 'official'
  AND id IN (
    'sg-official-2023-13',
    'sg-official-2023-14',
    'sg-official-2023-15',
    'sg-official-2024-13',
    'sg-official-2024-14',
    'sg-official-2024-15',
    'sg-official-2025-13',
    'sg-official-2025-14',
    'sg-official-2025-15',
    'sg-official-2026-13',
    'sg-official-2026-14',
    'sg-official-2026-15'
  );
