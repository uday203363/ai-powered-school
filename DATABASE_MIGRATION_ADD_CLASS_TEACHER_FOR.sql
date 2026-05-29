-- ============================================================================
-- DATABASE MIGRATION: Add class_teacher_for column to users table
-- Run this in Supabase SQL Editor to update the users table for class teacher management
-- ============================================================================

-- ============================================================================
-- STEP 1: ADD CLASS_TEACHER_FOR COLUMN 
-- ============================================================================

DO $$
BEGIN
  ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS class_teacher_for TEXT DEFAULT NULL;
  
  CREATE INDEX IF NOT EXISTS idx_users_class_teacher_for ON public.users(class_teacher_for);
  
  RAISE NOTICE 'class_teacher_for column added successfully';
EXCEPTION WHEN others THEN 
  RAISE NOTICE 'class_teacher_for column already exists or error occurred';
END $$;

-- ============================================================================
-- VERIFICATION QUERY
-- Uncomment to verify the changes
-- ============================================================================

-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'users' 
-- AND column_name = 'class_teacher_for'
-- ORDER BY ordinal_position;

-- Check a sample teacher record
-- SELECT id, name, email, assigned_classes, class_teacher_for, role 
-- FROM users 
-- WHERE role = 'teacher' 
-- LIMIT 1;
