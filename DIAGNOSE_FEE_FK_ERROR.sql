-- ============================================
-- DIAGNOSTIC: Foreign Key Constraint Error
-- ============================================
-- Run this in Supabase SQL Editor to diagnose the fee insertion error

-- Query 1: Check users table structure and check constraints
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'users' 
  AND column_name = 'id'
ORDER BY ordinal_position;

-- Query 2: Check fees table structure
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'fees' 
  AND column_name IN ('id', 'student_id')
ORDER BY ordinal_position;

-- Query 3: Check foreign key constraints on fees table
SELECT 
  kcu.table_name,
  kcu.column_name,
  ccu.table_name AS referenced_table,
  ccu.column_name AS referenced_column
FROM information_schema.key_column_usage kcu
LEFT JOIN information_schema.constraint_column_usage ccu 
  ON kcu.constraint_name = ccu.constraint_name
WHERE kcu.table_name = 'fees'
  AND kcu.column_name = 'student_id';

-- Query 4: Count total students in users table
SELECT 
  COUNT(*) as total_students,
  COUNT(CASE WHEN status = 'Active' THEN 1 END) as active_students,
  COUNT(CASE WHEN role = 'student' THEN 1 END) as students_with_role
FROM users
WHERE role = 'student';

-- Query 5: Show all students with their basic info
SELECT 
  id,
  register_no,
  name,
  class,
  status,
  role,
  current_fee
FROM users
WHERE role = 'student'
ORDER BY class, register_no
LIMIT 20;

-- Query 6: Check for duplicate student IDs (should be none)
SELECT 
  id,
  COUNT(*) as count
FROM users
WHERE role = 'student'
GROUP BY id
HAVING COUNT(*) > 1;

-- Query 7: Count fees records
SELECT 
  COUNT(*) as total_fees,
  COUNT(DISTINCT student_id) as unique_students_with_fees
FROM fees;

-- Query 8: Try to find any student_id in fees that doesn't exist in users
SELECT 
  f.student_id,
  COUNT(*) as fee_count,
  'MISSING IN USERS TABLE' as status
FROM fees f
LEFT JOIN users u ON f.student_id = u.id
WHERE u.id IS NULL
GROUP BY f.student_id;

-- Query 9: Check for NULL student_id in fees (constraint violation)
SELECT 
  COUNT(*) as null_student_ids
FROM fees
WHERE student_id IS NULL;

-- Query 10: Show all students in a specific class (replace 'Class Name' with actual class)
SELECT 
  id,
  register_no,
  name,
  class,
  status,
  current_fee
FROM users
WHERE class = 'Class Name'  -- REPLACE WITH YOUR CLASS NAME
  AND role = 'student'
  AND status = 'Active'
ORDER BY register_no;

-- Query 11: Try manual insert with first student (for testing)
-- First, get the first active student ID
-- Then uncomment and run the manual insert below:
/*
DO $$
DECLARE
  v_student_id UUID;
BEGIN
  -- Get first active student
  SELECT id INTO v_student_id
  FROM users
  WHERE role = 'student' AND status = 'Active'
  LIMIT 1;
  
  IF v_student_id IS NULL THEN
    RAISE NOTICE 'No active students found!';
  ELSE
    RAISE NOTICE 'Testing with student ID: %', v_student_id;
    
    -- Try to insert a test fee
    INSERT INTO fees (student_id, month, year, total_amount, paid_amount, status)
    VALUES (v_student_id, 4, 2026, 1000, 0, 'pending')
    RETURNING *;
    
    RAISE NOTICE 'Test insert successful!';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error during test insert: %', SQLERRM;
END $$;
*/

-- Query 12: Check RLS policies on fees table
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