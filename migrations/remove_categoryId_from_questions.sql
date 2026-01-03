-- Remove legacy categoryId column from questions table
ALTER TABLE questions DROP COLUMN IF EXISTS category_id CASCADE;
COMMIT;
