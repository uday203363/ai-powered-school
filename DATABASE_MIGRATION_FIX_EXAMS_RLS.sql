-- ============================================================================
-- DATABASE MIGRATION: Enable RLS on Exams Table with Proper Policies
-- Run this in Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- STEP 1: ENABLE RLS ON EXAMS TABLE
-- ============================================================================

DO $$
BEGIN
  ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
  RAISE NOTICE 'RLS enabled on exams table';
EXCEPTION WHEN others THEN 
  RAISE NOTICE 'RLS already enabled or error: %', SQLERRM;
END $$;

-- ============================================================================
-- STEP 2: DROP EXISTING POLICIES (if any)
-- ============================================================================

DO $$
BEGIN
  DROP POLICY IF EXISTS "Allow admins to select exams" ON public.exams;
  DROP POLICY IF EXISTS "Allow admins to insert exams" ON public.exams;
  DROP POLICY IF EXISTS "Allow admins to update exams" ON public.exams;
  DROP POLICY IF EXISTS "Allow admins to delete exams" ON public.exams;
  DROP POLICY IF EXISTS "Allow all to select exams" ON public.exams;
  DROP POLICY IF EXISTS "Allow all to insert exams" ON public.exams;
  DROP POLICY IF EXISTS "Allow all to update exams" ON public.exams;
  DROP POLICY IF EXISTS "Allow all to delete exams" ON public.exams;
  DROP POLICY IF EXISTS "exam_select_policy" ON public.exams;
  DROP POLICY IF EXISTS "exam_insert_policy" ON public.exams;
  DROP POLICY IF EXISTS "exam_update_policy" ON public.exams;
  DROP POLICY IF EXISTS "exam_delete_policy" ON public.exams;
  RAISE NOTICE 'Existing policies dropped';
EXCEPTION WHEN others THEN 
  RAISE NOTICE 'No existing policies to drop';
END $$;

-- ============================================================================
-- STEP 3: CREATE NEW PERMISSIVE POLICIES
-- ============================================================================

-- Allow anyone to SELECT exams
CREATE POLICY "Allow all to select exams"
ON public.exams
FOR SELECT
USING (true);

-- Allow anyone to INSERT exams
CREATE POLICY "Allow all to insert exams"
ON public.exams
FOR INSERT
WITH CHECK (true);

-- Allow anyone to UPDATE exams
CREATE POLICY "Allow all to update exams"
ON public.exams
FOR UPDATE
USING (true)
WITH CHECK (true);

-- Allow anyone to DELETE exams
CREATE POLICY "Allow all to delete exams"
ON public.exams
FOR DELETE
USING (true);

DO $$
BEGIN
  RAISE NOTICE 'All RLS policies created successfully';
END $$;
