-- ============================================================================
-- DATABASE MIGRATION: ADD YEAR AND MULTIPLE CLASSES TO EXAMS TABLE
-- ============================================================================
-- Run this in Supabase SQL Editor to add year and support multiple classes

DO $$
BEGIN
  -- Add year column
  ALTER TABLE public.exams 
  ADD COLUMN IF NOT EXISTS year INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_DATE);
  
  -- Add classes column (comma-separated or JSON array of class names)
  ALTER TABLE public.exams 
  ADD COLUMN IF NOT EXISTS classes TEXT;
  
  -- If old single class_name still exists, keep it for backward compatibility
  -- Create index on new columns for faster queries
  CREATE INDEX IF NOT EXISTS idx_exams_year ON public.exams(year);
  
EXCEPTION WHEN others THEN 
  RAISE NOTICE 'Columns may already exist: %', SQLERRM;
END $$;

-- Optional: Migrate existing exams to use classes field
-- UPDATE public.exams 
-- SET classes = class_name 
-- WHERE classes IS NULL AND class_name IS NOT NULL;

-- Verify the changes
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'exams' 
ORDER BY ordinal_position;
