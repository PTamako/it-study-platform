-- Remove redundant index found in the existing production schema.
-- idx_language_cards_language_category already covers the exact same key order.
-- No data rows are changed; tracked learning progress remains untouched.
DROP INDEX IF EXISTS idx_language_cards_lang_category;
