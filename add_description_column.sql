-- Add description column to exams table
ALTER TABLE exams ADD COLUMN IF NOT EXISTS description TEXT;
