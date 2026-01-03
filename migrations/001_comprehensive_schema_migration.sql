-- Comprehensive Database Schema Migration
-- This file ensures all tables have the required columns as defined in the schema

-- Add missing description column to exams table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'exams' 
        AND column_name = 'description'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE exams ADD COLUMN description TEXT;
        COMMENT ON COLUMN exams.description IS 'Optional description of the exam content';
        RAISE NOTICE 'Added description column to exams table';
    ELSE
        RAISE NOTICE 'Description column already exists in exams table';
    END IF;
END $$;

-- Add trackId column to exams table if it doesn't exist (for backward compatibility)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'exams' 
        AND column_name = 'track_id'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE exams ADD COLUMN track_id VARCHAR REFERENCES academic_tracks(id) ON DELETE SET NULL;
        COMMENT ON COLUMN exams.track_id IS 'Optional track reference for backward compatibility';
        RAISE NOTICE 'Added track_id column to exams table';
    ELSE
        RAISE NOTICE 'track_id column already exists in exams table';
    END IF;
END $$;

-- Ensure user_stats table exists for gamification features
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'user_stats' 
        AND table_schema = 'public'
    ) THEN
        CREATE TABLE user_stats (
            id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
            current_streak INTEGER DEFAULT 0,
            longest_streak INTEGER DEFAULT 0,
            total_questions_answered INTEGER DEFAULT 0,
            total_correct_answers INTEGER DEFAULT 0,
            accuracy DECIMAL(5,2) DEFAULT 0.00,
            achievements TEXT[] DEFAULT '{}',
            last_practice_date TIMESTAMP,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        );
        
        CREATE INDEX idx_user_stats_user_id ON user_stats(user_id);
        CREATE INDEX idx_user_stats_streak ON user_stats(current_streak);
        
        RAISE NOTICE 'Created user_stats table';
    ELSE
        RAISE NOTICE 'user_stats table already exists';
    END IF;
END $$;

-- Verify all required tables exist
DO $$
DECLARE
    table_name TEXT;
    missing_tables TEXT[] := '{}';
BEGIN
    -- Check for required tables
    FOR table_name IN ARRAY ARRAY[
        'users', 'exams', 'questions', 'question_options', 'exam_bodies', 
        'subjects', 'categories', 'attempts', 'subscriptions', 'user_stats'
    ] LOOP
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_name = table_name 
            AND table_schema = 'public'
        ) THEN
            missing_tables := array_append(missing_tables, table_name);
        END IF;
    END LOOP;
    
    IF array_length(missing_tables, 1) > 0 THEN
        RAISE EXCEPTION 'Missing required tables: %', array_to_string(missing_tables, ', ');
    ELSE
        RAISE NOTICE 'All required tables exist';
    END IF;
END $$;

-- Output final status
SELECT 
    'Database schema migration completed' as status,
    NOW() as completed_at;
