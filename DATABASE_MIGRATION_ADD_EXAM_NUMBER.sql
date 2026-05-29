-- ============================================================================
-- DATABASE MIGRATION: Add exam_number Column to Exams Table
-- Run this in Supabase SQL Editor
-- ============================================================================

DO $$
BEGIN
  ALTER TABLE public.exams
  ADD COLUMN IF NOT EXISTS exam_number VARCHAR(50) UNIQUE;
  
  CREATE INDEX IF NOT EXISTS idx_exams_exam_number ON public.exams(exam_number);
  
  RAISE NOTICE 'exam_number column added successfully';
EXCEPTION WHEN others THEN 
  RAISE NOTICE 'exam_number column error: %', SQLERRM;
END $$;

-- ============================================================================
-- VERIFY THE COLUMN WAS ADDED
-- ============================================================================

SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'exams'
ORDER BY ordinal_position;
