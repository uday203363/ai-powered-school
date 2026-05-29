-- ============================================================================
-- FIX FEES TABLE FOREIGN KEY CONSTRAINT
-- Change from students table to users table reference
-- ============================================================================
-- Run this in Supabase SQL Editor to fix the class fee management system
-- ============================================================================

-- ============================================================================
-- STEP 1: DROP EXISTING FOREIGN KEY CONSTRAINT
-- ============================================================================

ALTER TABLE IF EXISTS fees
DROP CONSTRAINT IF EXISTS fees_student_id_fkey;

-- ============================================================================
-- STEP 2: ADD NEW FOREIGN KEY CONSTRAINT POINTING TO USERS TABLE
-- ============================================================================

ALTER TABLE fees
ADD CONSTRAINT fees_student_id_fkey 
FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE;

-- ============================================================================
-- STEP 3: VERIFY THE CONSTRAINT WAS ADDED CORRECTLY
-- ============================================================================

SELECT 
  constraint_name,
  table_name,
  column_name,
  'VERIFIED ✅' as status
FROM information_schema.key_column_usage
WHERE table_name = 'fees' AND column_name = 'student_id';

-- ============================================================================
-- RESULT: Now you can insert fees for students from the users table!
-- ============================================================================
