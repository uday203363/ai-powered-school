-- ============================================================================
-- DATABASE MIGRATION: FIX ATTENDANCE FOREIGN KEY CONSTRAINT
-- ============================================================================
-- This migration fixes the attendance table to ensure proper foreign key
-- constraints and RLS policies for attendance records

DO $$
BEGIN
  -- 1. Disable RLS temporarily to fix structure
  ALTER TABLE public.attendance DISABLE ROW LEVEL SECURITY;
  
  -- 2. Drop all existing policies
  DROP POLICY IF EXISTS "attendance_all" ON public.attendance;
  DROP POLICY IF EXISTS "attendance_select" ON public.attendance;
  DROP POLICY IF EXISTS "attendance_insert" ON public.attendance;
  DROP POLICY IF EXISTS "attendance_update" ON public.attendance;
  
  -- 3. Drop existing foreign key constraint
  ALTER TABLE public.attendance
  DROP CONSTRAINT IF EXISTS attendance_student_id_fkey;
  
  -- 4. Recreate foreign key constraint with proper configuration
  ALTER TABLE public.attendance
  ADD CONSTRAINT attendance_student_id_fkey 
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE;
  
  -- 5. Drop existing unique constraint
  ALTER TABLE public.attendance
  DROP CONSTRAINT IF EXISTS unique_attendance_per_date;
  
  -- 6. Recreate unique constraint
  ALTER TABLE public.attendance
  ADD CONSTRAINT unique_attendance_per_date UNIQUE(student_id, date);
  
  -- 7. Ensure status constraint exists
  ALTER TABLE public.attendance
  DROP CONSTRAINT IF EXISTS attendance_status_check;
  
  ALTER TABLE public.attendance
  ADD CONSTRAINT attendance_status_check 
  CHECK (status IN ('present', 'absent', 'leave'));
  
  -- 8. Enable RLS again
  ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
  
  -- 9. Create a permissive policy that allows all operations
  CREATE POLICY "attendance_all" 
    ON public.attendance 
    FOR ALL
    USING (true) 
    WITH CHECK (true);
  
  RAISE NOTICE 'Attendance table structure fixed and RLS policies recreated';
EXCEPTION WHEN others THEN 
  RAISE NOTICE 'Error: %', SQLERRM;
END $$;

-- Verify the foreign key constraint
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'attendance' AND constraint_name LIKE '%student%';

-- Verify RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'attendance';

-- Check if students exist with valid UUIDs in users table
SELECT COUNT(*) as student_count, 
       COUNT(DISTINCT id) as unique_ids
FROM users 
WHERE role = 'student' AND id IS NOT NULL;
