-- ============================================================================
-- DATABASE MIGRATION: Add Exam Name and Assessment Type to Marks Table
-- Run this in Supabase SQL Editor to add new columns for marks tracking
-- ============================================================================

-- ============================================================================
-- STEP 1: ADD EXAM_NAME COLUMN
-- ============================================================================

DO $$
BEGIN
  ALTER TABLE public.marks
  ADD COLUMN IF NOT EXISTS exam_name VARCHAR(255);
  
  CREATE INDEX IF NOT EXISTS idx_marks_exam_name ON public.marks(exam_name);
  
  RAISE NOTICE 'Exam name column added successfully';
EXCEPTION WHEN others THEN 
  RAISE NOTICE 'Exam name column already exists or error occurred';
END $$;

-- ============================================================================
-- STEP 2: ADD ASSESSMENT_TYPE COLUMN (formative or summative)
-- ============================================================================

DO $$
BEGIN
  ALTER TABLE public.marks
  ADD COLUMN IF NOT EXISTS assessment_type VARCHAR(50) DEFAULT 'formative';
  
  -- Add constraint to ensure only valid values
  ALTER TABLE public.marks
  ADD CONSTRAINT valid_assessment_type 
  CHECK (assessment_type IN ('formative', 'summative'));
  
  CREATE INDEX IF NOT EXISTS idx_marks_assessment_type ON public.marks(assessment_type);
  
  RAISE NOTICE 'Assessment type column added successfully';
EXCEPTION WHEN others THEN 
  RAISE NOTICE 'Assessment type column already exists or error occurred';
END $$;

-- ============================================================================
-- VERIFICATION QUERY
-- Uncomment to verify the changes
-- ============================================================================

-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'marks' 
-- ORDER BY ordinal_position;
