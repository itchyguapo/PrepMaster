-- Migration: Question Bank Complete Overhaul
-- Date: 2025-01-XX
-- Description: Aligns question bank with instruction1.md requirements
-- Maintains backward compatibility with existing exam system

BEGIN;

-- =====================================================
-- 1. CREATE CATEGORIES TABLE (maps to academic_tracks)
-- =====================================================

-- Create categories table (simplified version of academic_tracks for question bank)
CREATE TABLE IF NOT EXISTS categories (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  exam_body_id VARCHAR NOT NULL REFERENCES exam_bodies(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(exam_body_id, name)
);

-- Populate categories from academic_tracks
INSERT INTO categories (id, name, exam_body_id, created_at)
SELECT 
  id,
  name,
  exam_body_id,
  created_at
FROM academic_tracks
WHERE is_active = true
ON CONFLICT DO NOTHING;

-- =====================================================
-- 2. UPDATE QUESTIONS TABLE
-- =====================================================

-- Add category_id column to questions (nullable for now, will be populated)
ALTER TABLE questions ADD COLUMN IF NOT EXISTS category_id VARCHAR REFERENCES categories(id) ON DELETE SET NULL;

-- Add topic column if it doesn't exist (as optional text field)
ALTER TABLE questions ADD COLUMN IF NOT EXISTS topic TEXT;

-- Populate category_id from track_subjects mapping
-- For each question, find its subject's track and use that as category
UPDATE questions q
SET category_id = (
  SELECT ts.track_id
  FROM track_subjects ts
  WHERE ts.subject_id = q.subject_id
    AND ts.exam_body_id = q.exam_body_id
  LIMIT 1
)
WHERE category_id IS NULL;

-- For questions without track mapping, create a default category
DO $$
DECLARE
  exam_body_record RECORD;
  default_category_id VARCHAR;
BEGIN
  FOR exam_body_record IN SELECT DISTINCT exam_body_id FROM questions WHERE category_id IS NULL
  LOOP
    -- Create or get default category for this exam body
    INSERT INTO categories (name, exam_body_id)
    VALUES ('General', exam_body_record.exam_body_id)
    ON CONFLICT (exam_body_id, name) DO UPDATE SET name = categories.name
    RETURNING id INTO default_category_id;
    
    -- Update questions without category
    UPDATE questions
    SET category_id = default_category_id
    WHERE exam_body_id = exam_body_record.exam_body_id
      AND category_id IS NULL;
  END LOOP;
END $$;

-- =====================================================
-- 3. UPDATE STATUS ENUM
-- =====================================================

-- Update status values to match new system
-- Map old statuses to new ones:
-- "draft" -> "review"
-- "reviewed" -> "review"  
-- "approved" -> "live"
-- "live" -> "live" (keep)
-- "archived" -> "disabled"

UPDATE questions SET status = 'review' WHERE status IN ('draft', 'reviewed');
UPDATE questions SET status = 'live' WHERE status = 'approved';
UPDATE questions SET status = 'disabled' WHERE status = 'archived';

-- Set default status to 'review' for new questions
ALTER TABLE questions ALTER COLUMN status SET DEFAULT 'review';

-- =====================================================
-- 4. UPDATE SUBJECTS TABLE
-- =====================================================

-- Ensure subjects have category_id and exam_body_id
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS category_id VARCHAR REFERENCES categories(id) ON DELETE SET NULL;
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS exam_body_id VARCHAR REFERENCES exam_bodies(id) ON DELETE CASCADE;

-- Populate subject category_id and exam_body_id from track_subjects
UPDATE subjects s
SET 
  category_id = (
    SELECT ts.track_id
    FROM track_subjects ts
    WHERE ts.subject_id = s.id
    LIMIT 1
  ),
  exam_body_id = (
    SELECT ts.exam_body_id
    FROM track_subjects ts
    WHERE ts.subject_id = s.id
    LIMIT 1
  )
WHERE category_id IS NULL OR exam_body_id IS NULL;

-- =====================================================
-- 5. CREATE INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_categories_exam_body ON categories(exam_body_id);
CREATE INDEX IF NOT EXISTS idx_questions_category ON questions(category_id);
CREATE INDEX IF NOT EXISTS idx_questions_status ON questions(status);
CREATE INDEX IF NOT EXISTS idx_subjects_category ON subjects(category_id);
CREATE INDEX IF NOT EXISTS idx_subjects_exam_body ON subjects(exam_body_id);

-- Composite index for common query pattern
CREATE INDEX IF NOT EXISTS idx_questions_exam_category_subject_status 
ON questions(exam_body_id, category_id, subject_id, status);

COMMIT;

