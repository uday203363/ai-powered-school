-- ============================================================================
-- DATABASE MIGRATION: FIX EXAM NUMBER UNIQUE CONSTRAINT
-- ============================================================================
-- Remove the global unique constraint on exam_number
-- and keep only the composite constraint (class_name, exam_number, exam_name)
-- This allows multiple classes to have the same exam number

DO $$
BEGIN
  -- Drop the problematic unique constraint if it exists
  ALTER TABLE public.exams 
  DROP CONSTRAINT IF EXISTS exams_exam_number_key CASCADE;
  
  -- Drop the old composite constraint if it exists
  ALTER TABLE public.exams
  DROP CONSTRAINT IF EXISTS unique_exam_per_class CASCADE;
  
  -- Create new composite constraint: Same exam number can be used in different classes
  ALTER TABLE public.exams
  ADD CONSTRAINT unique_exam_per_class UNIQUE(class_name, exam_number, exam_name);
  
EXCEPTION WHEN others THEN 
  RAISE NOTICE 'Error occurred: %', SQLERRM;
END $$;

-- Verify constraints
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'exams'
ORDER BY constraint_name;
