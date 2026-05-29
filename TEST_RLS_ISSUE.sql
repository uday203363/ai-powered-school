-- ============================================
-- TEST: RLS Policy Issue on Fees Table
-- ============================================
-- This script tests if RLS policies are blocking fee inserts

-- Step 1: Check current RLS status on fees table
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename = 'fees';

-- Step 2: List all RLS policies on fees table
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'fees'
ORDER BY policyname;

-- Step 3: Temporarily disable RLS to test (ONLY FOR TESTING!)
-- ⚠️ WARNING: This disables security restrictions, only use for testing!
ALTER TABLE public.fees DISABLE ROW LEVEL SECURITY;

-- Step 4: Now try a test insert with the first active student
DO $$
DECLARE
  v_student_id UUID;
  v_student_name TEXT;
BEGIN
  -- Get first active student
  SELECT id, name INTO v_student_id, v_student_name
  FROM users
  WHERE role = 'student' AND status = 'Active'
  LIMIT 1;
  
  IF v_student_id IS NULL THEN
    RAISE NOTICE '❌ ERROR: No active students found in the database!';
  ELSE
    RAISE NOTICE '✅ Found student: % (%)', v_student_name, v_student_id;
    
    -- Try to insert a test fee
    BEGIN
      INSERT INTO fees (student_id, month, year, total_amount, paid_amount, status)
      VALUES (v_student_id, 4, 2026, 5000, 0, 'pending')
      RETURNING id, student_id, total_amount;
      
      RAISE NOTICE '✅ SUCCESS! Fee insert worked without RLS.';
      RAISE NOTICE '   This means RLS policies were blocking the insert.';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE '❌ FAILED! Error: %', SQLERRM;
      RAISE NOTICE '   The issue is NOT RLS-related.';
    END;
  END IF;
END $$;

-- Step 5: Re-enable RLS after testing
-- ⚠️ IMPORTANT: Always re-enable RLS after testing!
ALTER TABLE public.fees ENABLE ROW LEVEL SECURITY;

-- Step 6: Verify RLS is back on
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename = 'fees';

-- Step 7: If the test insert succeeded, check the test record
SELECT 
  id,
  student_id,
  month,
  year,
  total_amount,
  paid_amount,
  status,
  created_at
FROM fees
WHERE month = 4 AND year = 2026
ORDER BY created_at DESC
LIMIT 1;