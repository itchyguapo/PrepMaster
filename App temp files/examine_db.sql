-- Database examination and cleanup script
-- This will help us identify and fix the question upload issues

-- First, let's see what tables exist
SELECT table_name, table_schema 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Now let's examine the questions table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'questions' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check question_options table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'question_options' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Look for any NOT NULL constraints without defaults that might cause issues
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'questions' 
AND table_schema = 'public'
AND is_nullable = 'NO' 
AND column_default IS NULL
AND column_name NOT IN ('id', 'created_at', 'updated_at')
ORDER BY ordinal_position;

-- Check for potentially redundant tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND (
  table_name LIKE '%track%' 
  OR table_name LIKE '%academic%'
  OR table_name LIKE '%exam_type%'
)
ORDER BY table_name;
