-- Preserve stable IDs and all attempt history; only disambiguate an
-- independently authored SG training prompt, not repeated official exam items.
UPDATE questions
SET prompt = '障害発生時のサービス停止時間を短縮するため、監視や切替手順を含めて講じるべき対策はどれか。'
WHERE id = 'sg-practice-0024'
  AND prompt = 'サービスの可用性を高める対策として最も適切なものはどれか。';
