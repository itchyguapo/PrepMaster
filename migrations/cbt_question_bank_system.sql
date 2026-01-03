-- Migration: CBT Question Bank System - Complete Schema Overhaul
-- Date: 2025-12-25
-- Description: Implements the complete hierarchical question bank system

-- =====================================================
-- 1. CREATE NEW TABLES
-- =====================================================

-- Exam Types (WASSCE, SSCE, UTME, etc.)
CREATE TABLE IF NOT EXISTS exam_types (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  exam_body_id VARCHAR NOT NULL REFERENCES exam_bodies(id) ON DELETE CASCADE,
  duration_minutes INTEGER NOT NULL,
  rules JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Academic Tracks (Science, Arts, Commercial) - replacing categories
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

-- Make subjects neutral (remove category dependency)
ALTER TABLE subjects
ADD COLUMN IF NOT EXISTS code TEXT,
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Track-Subject Junction Table (CRITICAL)
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

-- Syllabi (version-controlled curriculum)
CREATE TABLE IF NOT EXISTS syllabi (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  version TEXT NOT NULL,
  exam_body_id VARCHAR NOT NULL REFERENCES exam_bodies(id) ON DELETE CASCADE,
  subject_id VARCHAR NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  content JSONB,
  is_active BOOLEAN DEFAULT true,
  effective_from TIMESTAMP WITH TIME ZONE,
  effective_to TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Topics (within syllabi)
CREATE TABLE IF NOT EXISTS topics (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT,
  syllabus_id VARCHAR NOT NULL REFERENCES syllabi(id) ON DELETE CASCADE,
  subject_id VARCHAR NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  exam_body_id VARCHAR NOT NULL REFERENCES exam_bodies(id) ON DELETE CASCADE,
  description TEXT,
  "order" INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Subtopics (within topics)
CREATE TABLE IF NOT EXISTS subtopics (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT,
  topic_id VARCHAR NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  syllabus_id VARCHAR NOT NULL REFERENCES syllabi(id) ON DELETE CASCADE,
  subject_id VARCHAR NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  exam_body_id VARCHAR NOT NULL REFERENCES exam_bodies(id) ON DELETE CASCADE,
  description TEXT,
  "order" INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Exam Rules (extensible configuration)
CREATE TABLE IF NOT EXISTS exam_rules (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_type_id VARCHAR NOT NULL REFERENCES exam_types(id) ON DELETE CASCADE,
  track_id VARCHAR REFERENCES academic_tracks(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  rules JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Question Options (separate from questions table)
CREATE TABLE IF NOT EXISTS question_options (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id VARCHAR NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  option_id TEXT NOT NULL,
  text TEXT NOT NULL,
  "order" INTEGER DEFAULT 0,
  is_correct BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Marking Guides (for essay/short answer questions)
CREATE TABLE IF NOT EXISTS marking_guides (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id VARCHAR NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  criteria TEXT NOT NULL,
  description TEXT NOT NULL,
  marks INTEGER NOT NULL,
  "order" INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Question Versions (for tracking changes)
CREATE TABLE IF NOT EXISTS question_versions (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id VARCHAR NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  text TEXT NOT NULL,
  type TEXT CHECK (type IN ('multiple_choice', 'true_false', 'short_answer', 'essay')),
  difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')),
  marks INTEGER,
  exam_body_id VARCHAR NOT NULL,
  exam_type_id VARCHAR NOT NULL,
  subject_id VARCHAR NOT NULL,
  syllabus_id VARCHAR,
  topic_id VARCHAR,
  subtopic_id VARCHAR,
  options JSONB,
  marking_guides JSONB,
  change_reason TEXT,
  changed_by VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 2. MODIFY EXISTING TABLES
-- =====================================================

-- Update questions table structure
ALTER TABLE questions
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'live',
ADD COLUMN IF NOT EXISTS version_id VARCHAR,
ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'multiple_choice' CHECK (type IN ('multiple_choice', 'true_false', 'short_answer', 'essay')),
ADD COLUMN IF NOT EXISTS marks INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS exam_type_id VARCHAR REFERENCES exam_types(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS syllabus_id VARCHAR REFERENCES syllabi(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS topic_id VARCHAR REFERENCES topics(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS subtopic_id VARCHAR REFERENCES subtopics(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS source TEXT,
ADD COLUMN IF NOT EXISTS tags JSONB,
ADD COLUMN IF NOT EXISTS reviewed_by VARCHAR REFERENCES users(id),
ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS approved_by VARCHAR REFERENCES users(id),
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS archived_by VARCHAR REFERENCES users(id),
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS archive_reason TEXT,
ADD COLUMN IF NOT EXISTS usage_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS created_by VARCHAR REFERENCES users(id) ON DELETE CASCADE;

-- Create a system user if it doesn't exist
INSERT INTO users (id, username, password, email, role, created_at)
VALUES ('system-user', 'system', '$2b$10$dummy', 'system@prepmaster.com', 'admin', NOW())
ON CONFLICT (id) DO NOTHING;

-- Set default created_by for existing questions
UPDATE questions SET created_by = 'system-user' WHERE created_by IS NULL;

-- Add status constraint (assuming status column was added above)
ALTER TABLE questions
DROP CONSTRAINT IF EXISTS questions_status_check,
ADD CONSTRAINT questions_status_check CHECK (status IN ('draft', 'reviewed', 'approved', 'live', 'archived'));

-- Update exams table structure
ALTER TABLE exams
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS exam_type_id VARCHAR REFERENCES exam_types(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS track_id VARCHAR REFERENCES academic_tracks(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS selected_subjects JSONB,
ADD COLUMN IF NOT EXISTS question_distribution JSONB,
ADD COLUMN IF NOT EXISTS duration_minutes INTEGER,
ADD COLUMN IF NOT EXISTS total_questions INTEGER,
ADD COLUMN IF NOT EXISTS total_marks INTEGER,
ADD COLUMN IF NOT EXISTS applied_rules JSONB,
ADD COLUMN IF NOT EXISTS is_practice BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS is_randomized BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS created_by VARCHAR REFERENCES users(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS starts_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS ends_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Update exams status
ALTER TABLE exams
DROP CONSTRAINT IF EXISTS exams_status_check,
ADD CONSTRAINT exams_status_check CHECK (status IN ('draft', 'published', 'archived'));

-- =====================================================
-- 3. DATA MIGRATION
-- =====================================================

-- Step 1: Migrate categories to academic_tracks
INSERT INTO academic_tracks (id, name, code, exam_body_id, description, created_at)
SELECT
  c.id,
  c.name,
  UPPER(REPLACE(c.name, ' ', '_')),
  c.exam_body_id,
  'Migrated from categories table',
  c.created_at
FROM categories c
ON CONFLICT (id) DO NOTHING;

-- Step 2: Create track-subject mappings (assume all existing mappings are required)
INSERT INTO track_subjects (track_id, subject_id, exam_body_id, is_required, created_at)
SELECT
  s.category_id as track_id,
  s.id as subject_id,
  s.exam_body_id,
  true as is_required,
  s.created_at
FROM subjects s
WHERE s.category_id IS NOT NULL
ON CONFLICT (track_id, subject_id) DO NOTHING;

-- Step 3: Create default exam types for each exam body
INSERT INTO exam_types (name, code, exam_body_id, duration_minutes, rules, created_at)
SELECT
  CASE eb.name
    WHEN 'WAEC' THEN 'WASSCE School Certificate'
    WHEN 'NECO' THEN 'SSCE Senior School Certificate'
    WHEN 'JAMB' THEN 'UTME Unified Tertiary Matriculation Examination'
    ELSE eb.name || ' Certificate'
  END as name,
  CASE eb.name
    WHEN 'WAEC' THEN 'WASSCE'
    WHEN 'NECO' THEN 'SSCE'
    WHEN 'JAMB' THEN 'UTME'
    ELSE UPPER(REPLACE(eb.name, ' ', ''))
  END as code,
  eb.id as exam_body_id,
  CASE eb.name
    WHEN 'WAEC' THEN 180
    WHEN 'NECO' THEN 180
    WHEN 'JAMB' THEN 120
    ELSE 180
  END as duration_minutes,
  '{
    "questionCount": 50,
    "subjectsRequired": 9,
    "randomizationEnabled": true,
    "passingScore": 50
  }'::jsonb as rules,
  NOW() as created_at
FROM exam_bodies eb
ON CONFLICT DO NOTHING;

-- Step 4: Update existing questions with default exam type
UPDATE questions
SET
  exam_type_id = (
    SELECT et.id
    FROM exam_types et
    WHERE et.exam_body_id = questions.exam_body_id
    LIMIT 1
  ),
  type = CASE
    WHEN jsonb_array_length(options) = 2 THEN 'true_false'
    ELSE 'multiple_choice'
  END,
  created_by = COALESCE(created_by, 'system')
WHERE exam_type_id IS NULL;

-- Step 5: Migrate question options to separate table
INSERT INTO question_options (question_id, option_id, text, "order", is_correct, created_at)
SELECT
  q.id as question_id,
  opt->>'id' as option_id,
  opt->>'text' as text,
  0 as "order",
  CASE WHEN opt->>'id' = q.correct_answer THEN true ELSE false END as is_correct,
  q.created_at
FROM questions q,
  jsonb_array_elements(q.options) as opt
ON CONFLICT DO NOTHING;

-- Step 6: Update exams with new structure
UPDATE exams
SET
  exam_type_id = (
    SELECT et.id
    FROM exam_types et
    WHERE et.exam_body_id = exams.exam_body_id
    LIMIT 1
  ),
  track_id = category_id,
  duration_minutes = GREATEST(duration / 60, 60),
  total_questions = array_length(question_ids, 1),
  total_marks = array_length(question_ids, 1),
  created_by = COALESCE(tutor_id, 'system'),
  updated_at = NOW()
WHERE exam_type_id IS NULL;

-- =====================================================
-- 4. CREATE INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_exam_types_exam_body ON exam_types(exam_body_id);
CREATE INDEX IF NOT EXISTS idx_academic_tracks_exam_body ON academic_tracks(exam_body_id);
CREATE INDEX IF NOT EXISTS idx_track_subjects_track ON track_subjects(track_id);
CREATE INDEX IF NOT EXISTS idx_track_subjects_subject ON track_subjects(subject_id);
CREATE INDEX IF NOT EXISTS idx_syllabi_exam_body ON syllabi(exam_body_id);
CREATE INDEX IF NOT EXISTS idx_syllabi_subject ON syllabi(subject_id);
CREATE INDEX IF NOT EXISTS idx_topics_syllabus ON topics(syllabus_id);
CREATE INDEX IF NOT EXISTS idx_topics_subject ON topics(subject_id);
CREATE INDEX IF NOT EXISTS idx_subtopics_topic ON subtopics(topic_id);
CREATE INDEX IF NOT EXISTS idx_subtopics_syllabus ON subtopics(syllabus_id);
CREATE INDEX IF NOT EXISTS idx_exam_rules_exam_type ON exam_rules(exam_type_id);
CREATE INDEX IF NOT EXISTS idx_exam_rules_track ON exam_rules(track_id);
CREATE INDEX IF NOT EXISTS idx_question_options_question ON question_options(question_id);
CREATE INDEX IF NOT EXISTS idx_marking_guides_question ON marking_guides(question_id);
CREATE INDEX IF NOT EXISTS idx_question_versions_question ON question_versions(question_id);
CREATE INDEX IF NOT EXISTS idx_questions_exam_type ON questions(exam_type_id);
CREATE INDEX IF NOT EXISTS idx_questions_subject ON questions(subject_id);
CREATE INDEX IF NOT EXISTS idx_questions_syllabus ON questions(syllabus_id);
CREATE INDEX IF NOT EXISTS idx_questions_topic ON questions(topic_id);
CREATE INDEX IF NOT EXISTS idx_questions_status ON questions(status);
CREATE INDEX IF NOT EXISTS idx_exams_exam_type ON exams(exam_type_id);
CREATE INDEX IF NOT EXISTS idx_exams_track ON exams(track_id);

-- =====================================================
-- 5. CLEANUP (Optional - run after verification)
-- =====================================================

-- Note: Keep these commented until data migration is verified
-- ALTER TABLE subjects DROP COLUMN IF EXISTS category_id;
-- DROP TABLE IF EXISTS categories;

COMMIT;
