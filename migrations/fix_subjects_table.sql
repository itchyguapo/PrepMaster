-- Fix subjects table to match schema
-- This migration ensures the subjects table has all required columns

BEGIN;

-- Add code column if it doesn't exist (required field)
ALTER TABLE subjects
ADD COLUMN IF NOT EXISTS code TEXT;

-- Update existing subjects to have a code if they don't have one
-- Generate code from name (first 3-4 uppercase letters)
UPDATE subjects
SET code = UPPER(SUBSTRING(name FROM 1 FOR 4))
WHERE code IS NULL OR code = '';

-- Make code NOT NULL after setting defaults
-- First, ensure all rows have a code
UPDATE subjects
SET code = UPPER(SUBSTRING(REPLACE(name, ' ', '') FROM 1 FOR 4))
WHERE code IS NULL OR code = '';

-- Add description column if it doesn't exist
ALTER TABLE subjects
ADD COLUMN IF NOT EXISTS description TEXT;

-- Add is_active column if it doesn't exist
ALTER TABLE subjects
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Add updated_at column if it doesn't exist
ALTER TABLE subjects
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Set updated_at for existing rows
UPDATE subjects
SET updated_at = COALESCE(created_at, NOW())
WHERE updated_at IS NULL;

-- Now make code NOT NULL (PostgreSQL doesn't support adding NOT NULL directly, so we do it in steps)
-- First ensure all rows have a code
DO $$
BEGIN
  -- Ensure every subject has a code
  UPDATE subjects
  SET code = UPPER(SUBSTRING(REPLACE(name, ' ', '') FROM 1 FOR 4))
  WHERE code IS NULL OR code = '';
  
  -- If still null, use a fallback
  UPDATE subjects
  SET code = 'SUB' || SUBSTRING(id FROM 1 FOR 4)
  WHERE code IS NULL OR code = '';
END $$;

-- Add NOT NULL constraint to code (if not already there)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'subjects' 
    AND column_name = 'code' 
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE subjects ALTER COLUMN code SET NOT NULL;
  END IF;
END $$;

COMMIT;

