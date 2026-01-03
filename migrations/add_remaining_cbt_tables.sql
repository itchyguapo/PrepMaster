-- Add Remaining CBT Tables
-- Date: 2025-12-25

-- Track-Subject Junction (CRITICAL)
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

-- Syllabi
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

-- Topics
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

-- Subtopics
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

-- Question Options
CREATE TABLE IF NOT EXISTS question_options (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id VARCHAR NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  option_id TEXT NOT NULL,
  text TEXT NOT NULL,
  "order" INTEGER DEFAULT 0,
  is_correct BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Marking Guides
CREATE TABLE IF NOT EXISTS marking_guides (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id VARCHAR NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  criteria TEXT NOT NULL,
  description TEXT NOT NULL,
  marks INTEGER NOT NULL,
  "order" INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Question Versions
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

-- Exam Rules
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

-- Add missing columns to questions if not exist
ALTER TABLE questions ADD COLUMN IF NOT EXISTS syllabus_id VARCHAR REFERENCES syllabi(id) ON DELETE SET NULL;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS topic_id VARCHAR REFERENCES topics(id) ON DELETE SET NULL;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS subtopic_id VARCHAR REFERENCES subtopics(id) ON DELETE SET NULL;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS reviewed_by VARCHAR REFERENCES users(id);
ALTER TABLE questions ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS approved_by VARCHAR REFERENCES users(id);
ALTER TABLE questions ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS archived_by VARCHAR REFERENCES users(id);
ALTER TABLE questions ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS archive_reason TEXT;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS usage_count INTEGER DEFAULT 0;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS version_id VARCHAR;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'multiple_choice';
ALTER TABLE questions ADD COLUMN IF NOT EXISTS marks INTEGER DEFAULT 1;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS source TEXT;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS tags JSONB;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_track_subjects_track ON track_subjects(track_id);
CREATE INDEX IF NOT EXISTS idx_track_subjects_subject ON track_subjects(subject_id);
CREATE INDEX IF NOT EXISTS idx_syllabi_exam_body ON syllabi(exam_body_id);
CREATE INDEX IF NOT EXISTS idx_syllabi_subject ON syllabi(subject_id);
CREATE INDEX IF NOT EXISTS idx_topics_syllabus ON topics(syllabus_id);
CREATE INDEX IF NOT EXISTS idx_subtopics_topic ON subtopics(topic_id);
CREATE INDEX IF NOT EXISTS idx_question_options_question ON question_options(question_id);
CREATE INDEX IF NOT EXISTS idx_question_versions_question ON question_versions(question_id);
CREATE INDEX IF NOT EXISTS idx_exam_rules_exam_type ON exam_rules(exam_type_id);
CREATE INDEX IF NOT EXISTS idx_questions_syllabus ON questions(syllabus_id);
CREATE INDEX IF NOT EXISTS idx_questions_topic ON questions(topic_id);

COMMIT;
