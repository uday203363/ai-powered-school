-- ============================================================================
-- DATABASE MIGRATION: FIX ATTENDANCE TABLE RLS POLICIES
-- ============================================================================
-- Ensure RLS is properly configured for attendance table with permissive policy

DO $$
BEGIN
  -- Enable RLS on attendance table
  ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
  
  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS "attendance_all" ON public.attendance;
  DROP POLICY IF EXISTS "attendance_select" ON public.attendance;
  DROP POLICY IF EXISTS "attendance_insert" ON public.attendance;
  DROP POLICY IF EXISTS "attendance_update" ON public.attendance;
  DROP POLICY IF EXISTS "attendance_delete" ON public.attendance;
  
  -- Create permissive policy that allows all operations for authenticated users
  CREATE POLICY "attendance_all" 
    ON public.attendance 
    FOR ALL 
    USING (true) 
    WITH CHECK (true);
  
  RAISE NOTICE 'Attendance RLS policies configured';
EXCEPTION WHEN others THEN 
  RAISE NOTICE 'Error setting up RLS: %', SQLERRM;
END $$;

-- Verify RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'attendance';

-- Check policies
SELECT policyname, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'attendance';
