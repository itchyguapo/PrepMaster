-- Comprehensive Fix: Make Subjects Neutral Entities (Per Architecture)
-- This migration ensures subjects table matches the architecture requirements:
-- - Subjects are NEUTRAL entities (no direct category_id or exam_body_id)
-- - Relationships are through track_subjects junction table
-- - All required columns exist and are properly configured

BEGIN;

-- Step 1: Ensure all required columns exist
ALTER TABLE subjects
ADD COLUMN IF NOT EXISTS code TEXT,
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Step 2: Generate codes for existing subjects that don't have one
UPDATE subjects
SET code = UPPER(SUBSTRING(REPLACE(name, ' ', '') FROM 1 FOR 4))
WHERE code IS NULL OR code = '';

-- Step 3: Fallback for any subjects still without codes
UPDATE subjects
SET code = 'SUB' || SUBSTRING(id FROM 1 FOR 4)
WHERE code IS NULL OR code = '';

-- Step 4: Set updated_at for existing rows
UPDATE subjects
SET updated_at = COALESCE(created_at, NOW())
WHERE updated_at IS NULL;

-- Step 5: Make code NOT NULL (after ensuring all rows have values)
DO $$
BEGIN
  -- Final check: ensure every subject has a code
  UPDATE subjects
  SET code = 'SUB' || SUBSTRING(id FROM 1 FOR 4)
  WHERE code IS NULL OR code = '';
  
  -- Add NOT NULL constraint if not already there
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'subjects' 
    AND column_name = 'code' 
    AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE subjects ALTER COLUMN code SET NOT NULL;
  END IF;
END $$;

-- Step 6: CRITICAL - Remove category_id constraint and column
-- First, drop any foreign key constraints on category_id
DO $$
BEGIN
  -- Drop foreign key constraint if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'subjects' 
    AND constraint_name LIKE '%category%'
    AND constraint_type = 'FOREIGN KEY'
  ) THEN
    -- Get the constraint name and drop it
    EXECUTE (
      SELECT 'ALTER TABLE subjects DROP CONSTRAINT IF EXISTS ' || constraint_name || ' CASCADE'
      FROM information_schema.table_constraints 
      WHERE table_name = 'subjects' 
      AND constraint_name LIKE '%category%'
      AND constraint_type = 'FOREIGN KEY'
      LIMIT 1
    );
  END IF;
END $$;

-- Step 7: Make category_id nullable first (if it exists)
ALTER TABLE subjects
ALTER COLUMN category_id DROP NOT NULL;

-- Step 8: Remove category_id column entirely (subjects are neutral!)
ALTER TABLE subjects
DROP COLUMN IF EXISTS category_id CASCADE;

-- Step 9: Also remove exam_body_id from subjects if it exists (subjects are neutral!)
-- The relationship should be through track_subjects only
ALTER TABLE subjects
DROP COLUMN IF EXISTS exam_body_id CASCADE;

-- Step 10: Ensure track_subjects junction table exists and is properly configured
CREATE TABLE IF NOT EXISTS track_subjects (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id VARCHAR NOT NULL REFERENCES academic_tracks(id) ON DELETE CASCADE,
  subject_id VARCHAR NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  exam_body_id VARCHAR NOT NULL REFERENCES exam_bodies(id) ON DELETE CASCADE,
  is_required BOOLEAN DEFAULT true,
  "order" INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(track_id, subject_id)
);

-- Step 11: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_track_subjects_track ON track_subjects(track_id);
CREATE INDEX IF NOT EXISTS idx_track_subjects_subject ON track_subjects(subject_id);
CREATE INDEX IF NOT EXISTS idx_track_subjects_exam_body ON track_subjects(exam_body_id);
CREATE INDEX IF NOT EXISTS idx_subjects_code ON subjects(code);
CREATE INDEX IF NOT EXISTS idx_subjects_is_active ON subjects(is_active);

COMMIT;

-- Verification queries (run these manually to verify):
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'subjects' 
-- ORDER BY ordinal_position;
--
-- Should show: id, name, code, description, is_active, created_at, updated_at
-- Should NOT show: category_id, exam_body_id

