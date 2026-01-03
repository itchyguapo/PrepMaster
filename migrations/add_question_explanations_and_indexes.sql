-- Migration: Add explanation tiers and database indexes for question bank optimization
-- This migration adds briefExplanation and detailedExplanation fields
-- and creates indexes for better query performance

-- Add new explanation fields
ALTER TABLE questions 
ADD COLUMN IF NOT EXISTS brief_explanation TEXT,
ADD COLUMN IF NOT EXISTS detailed_explanation TEXT,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Migrate existing explanation data to briefExplanation for backward compatibility
UPDATE questions 
SET brief_explanation = explanation 
WHERE explanation IS NOT NULL AND brief_explanation IS NULL;

-- Create indexes for better query performance
-- These indexes will significantly improve query speed as the question bank grows

-- Index on examBodyId (most common filter)
CREATE INDEX IF NOT EXISTS idx_questions_exam_body ON questions(exam_body_id);

-- Index on categoryId (common filter)
CREATE INDEX IF NOT EXISTS idx_questions_category ON questions(category_id);

-- Index on subjectId (common filter)
CREATE INDEX IF NOT EXISTS idx_questions_subject ON questions(subject_id);

-- Index on status (filters out Review questions)
CREATE INDEX IF NOT EXISTS idx_questions_status ON questions(status);

-- Index on topic (for topic-based filtering)
CREATE INDEX IF NOT EXISTS idx_questions_topic ON questions(topic) WHERE topic IS NOT NULL;

-- Composite index for common query pattern (examBodyId + categoryId + status)
CREATE INDEX IF NOT EXISTS idx_questions_exam_category_status 
ON questions(exam_body_id, category_id, status);

-- Composite index for subject-based queries (examBodyId + subjectId + status)
CREATE INDEX IF NOT EXISTS idx_questions_exam_subject_status 
ON questions(exam_body_id, subject_id, status);

-- Index on created_at for sorting and filtering by date
CREATE INDEX IF NOT EXISTS idx_questions_created_at ON questions(created_at DESC);

-- Index on updated_at for tracking recent changes
CREATE INDEX IF NOT EXISTS idx_questions_updated_at ON questions(updated_at DESC);

-- Add comment to document the migration
COMMENT ON COLUMN questions.brief_explanation IS 'Brief explanation (1-2 sentences) visible to Standard and Premium users';
COMMENT ON COLUMN questions.detailed_explanation IS 'Detailed explanation (step-by-step) visible to Premium users only';
COMMENT ON COLUMN questions.explanation IS 'Legacy field - kept for backward compatibility. Use brief_explanation instead.';

