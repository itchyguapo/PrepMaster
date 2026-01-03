-- Minimal CBT Migration - Just add the essential new tables
-- Date: 2025-12-25

-- Add status column to questions if it doesn't exist
ALTER TABLE questions ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'live';

-- Update existing status values to match new enum
UPDATE questions SET status = 'live' WHERE status IS NULL OR status NOT IN ('draft', 'reviewed', 'approved', 'live', 'archived');

-- Add constraint for status
ALTER TABLE questions DROP CONSTRAINT IF EXISTS questions_status_check;
ALTER TABLE questions ADD CONSTRAINT questions_status_check CHECK (status IN ('draft', 'reviewed', 'approved', 'live', 'archived'));

-- Create essential new tables FIRST (before adding foreign keys)
CREATE TABLE IF NOT EXISTS exam_types (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  exam_body_id VARCHAR NOT NULL REFERENCES exam_bodies(id) ON DELETE CASCADE,
  duration_minutes INTEGER NOT NULL DEFAULT 180,
  rules JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS academic_tracks (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  exam_body_id VARCHAR NOT NULL REFERENCES exam_bodies(id) ON DELETE CASCADE,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Migrate categories to tracks
INSERT INTO academic_tracks (id, name, code, exam_body_id, description, created_at)
SELECT c.id, c.name, UPPER(REPLACE(c.name, ' ', '_')), c.exam_body_id, 'Migrated from categories', c.created_at
FROM categories c
ON CONFLICT (id) DO NOTHING;

-- Create basic exam types
INSERT INTO exam_types (name, code, exam_body_id, duration_minutes, rules)
SELECT
  CASE eb.name
    WHEN 'WAEC' THEN 'WASSCE School Certificate'
    WHEN 'NECO' THEN 'SSCE Senior School Certificate'
    WHEN 'JAMB' THEN 'UTME Unified Tertiary Matriculation Examination'
    ELSE eb.name || ' Certificate'
  END,
  CASE eb.name
    WHEN 'WAEC' THEN 'WASSCE'
    WHEN 'NECO' THEN 'SSCE'
    WHEN 'JAMB' THEN 'UTME'
    ELSE UPPER(REPLACE(eb.name, ' ', ''))
  END,
  eb.id,
  180,
  '{"questionCount": 50, "subjectsRequired": 9, "randomizationEnabled": true, "passingScore": 50}'
FROM exam_bodies eb
ON CONFLICT DO NOTHING;

-- Create system user
INSERT INTO users (id, username, password, email, role, created_at)
VALUES ('system-user', 'system', '$2b$10$dummy', 'system@prepmaster.com', 'admin', NOW())
ON CONFLICT (id) DO NOTHING;

-- Add created_by column to questions
ALTER TABLE questions ADD COLUMN IF NOT EXISTS created_by VARCHAR REFERENCES users(id) ON DELETE CASCADE;

-- Set created_by for existing questions
UPDATE questions SET created_by = 'system-user' WHERE created_by IS NULL;

-- Now make created_by NOT NULL (only if all rows have values)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM questions WHERE created_by IS NULL
    ) THEN
        ALTER TABLE questions ALTER COLUMN created_by SET NOT NULL;
    END IF;
END $$;

-- Add exam_type_id column (after exam_types table exists)
ALTER TABLE questions ADD COLUMN IF NOT EXISTS exam_type_id VARCHAR REFERENCES exam_types(id) ON DELETE CASCADE;

-- Update questions with exam types
UPDATE questions SET exam_type_id = (
  SELECT et.id FROM exam_types et WHERE et.exam_body_id = questions.exam_body_id LIMIT 1
) WHERE exam_type_id IS NULL;

COMMIT;
