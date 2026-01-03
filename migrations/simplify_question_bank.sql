BEGIN;

-- Make examTypeId nullable in questions (if column exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'questions' 
    AND column_name = 'exam_type_id' 
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE questions ALTER COLUMN exam_type_id DROP NOT NULL;
    RAISE NOTICE 'Made exam_type_id nullable in questions table';
  ELSE
    RAISE NOTICE 'exam_type_id column does not exist in questions table or is already nullable';
  END IF;
END $$;

-- Make examTypeId nullable in exams (if column exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'exams' 
    AND column_name = 'exam_type_id' 
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE exams ALTER COLUMN exam_type_id DROP NOT NULL;
    RAISE NOTICE 'Made exam_type_id nullable in exams table';
  ELSE
    RAISE NOTICE 'exam_type_id column does not exist in exams table or is already nullable';
  END IF;
END $$;

-- Update exam_rules to add examBodyId and make examTypeId nullable
ALTER TABLE exam_rules ADD COLUMN IF NOT EXISTS exam_body_id VARCHAR REFERENCES exam_bodies(id) ON DELETE CASCADE;

-- Make examTypeId nullable in exam_rules (if column exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'exam_rules' 
    AND column_name = 'exam_type_id' 
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE exam_rules ALTER COLUMN exam_type_id DROP NOT NULL;
    RAISE NOTICE 'Made exam_type_id nullable in exam_rules table';
  ELSE
    RAISE NOTICE 'exam_type_id column does not exist in exam_rules table or is already nullable';
  END IF;
END $$;

-- Update existing exam_rules to set examBodyId from examType (if examTypeId exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'exam_rules' 
    AND column_name = 'exam_type_id'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'exam_rules' 
    AND column_name = 'exam_body_id'
  ) THEN
    UPDATE exam_rules er
    SET exam_body_id = et.exam_body_id
    FROM exam_types et
    WHERE er.exam_type_id = et.id AND er.exam_body_id IS NULL;
    RAISE NOTICE 'Updated exam_rules with exam_body_id from exam_types';
  ELSE
    RAISE NOTICE 'Skipping exam_rules update - required columns do not exist';
  END IF;
END $$;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_questions_exam_body_category ON questions(exam_body_id, subject_id);
CREATE INDEX IF NOT EXISTS idx_track_subjects_exam_body ON track_subjects(exam_body_id, track_id);

COMMIT;

