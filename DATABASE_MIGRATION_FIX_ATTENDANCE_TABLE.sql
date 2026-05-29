-- ============================================================================
-- DATABASE MIGRATION: FIX ATTENDANCE TABLE ISSUES
-- ============================================================================
-- Add composite unique constraint to prevent duplicate attendance records
-- and ensure attendance data integrity

DO $$
BEGIN
  -- Drop existing unique constraint if it exists
  ALTER TABLE public.attendance 
  DROP CONSTRAINT IF EXISTS unique_attendance_per_date CASCADE;
  
  -- Add composite unique constraint: one record per student per date
  ALTER TABLE public.attendance
  ADD CONSTRAINT unique_attendance_per_date UNIQUE(student_id, date);
  
  -- Ensure status column has proper constraint
  ALTER TABLE public.attendance
  DROP CONSTRAINT IF EXISTS attendance_status_check;
  
  ALTER TABLE public.attendance
  ADD CONSTRAINT attendance_status_check 
  CHECK (status IN ('present', 'absent', 'leave'));
  
EXCEPTION WHEN others THEN 
  RAISE NOTICE 'Error occurred: %', SQLERRM;
END $$;

-- Verify attendance table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'attendance'
ORDER BY ordinal_position;

-- Check for duplicate records
SELECT student_id, date, COUNT(*) as record_count
FROM public.attendance
GROUP BY student_id, date
HAVING COUNT(*) > 1;
