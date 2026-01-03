-- Add missing description column to exams table
-- This migration adds the description column that exists in the schema but not in the database
ALTER TABLE exams ADD COLUMN IF NOT EXISTS description TEXT;

-- Add comments for documentation
COMMENT ON COLUMN exams.description IS 'Optional description of the exam content';
