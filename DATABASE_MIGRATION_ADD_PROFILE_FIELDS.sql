-- ============================================================================
-- DATABASE MIGRATION: Add Gender, Accommodation, and Fee Details Fields
-- Run this in Supabase SQL Editor to add new columns for student/admin/teacher profiles
-- ============================================================================

-- ============================================================================
-- STEP 1: ADD GENDER COLUMN (for admin, teacher, and student roles)
-- ============================================================================

DO $$
BEGIN
  ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS gender VARCHAR(50);
  
  CREATE INDEX IF NOT EXISTS idx_users_gender ON public.users(gender);
  
  RAISE NOTICE 'Gender column added successfully';
EXCEPTION WHEN others THEN 
  RAISE NOTICE 'Gender column already exists or error occurred';
END $$;

-- ============================================================================
-- STEP 2: ADD ACCOMMODATION TYPE COLUMN (for students)
-- ============================================================================

DO $$
BEGIN
  ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS accommodation_type VARCHAR(100);
  
  RAISE NOTICE 'Accommodation type column added successfully';
EXCEPTION WHEN others THEN 
  RAISE NOTICE 'Accommodation type column already exists or error occurred';
END $$;

-- ============================================================================
-- STEP 3: ADD FEE STATUS COLUMN (for students)
-- ============================================================================

DO $$
BEGIN
  ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS fee_status VARCHAR(50);
  
  RAISE NOTICE 'Fee status column added successfully';
EXCEPTION WHEN others THEN 
  RAISE NOTICE 'Fee status column already exists or error occurred';
END $$;

-- ============================================================================
-- STEP 4: ADD FEE AMOUNT COLUMN (for students)
-- ============================================================================

DO $$
BEGIN
  ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS fee_amount DECIMAL(10,2);
  
  CREATE INDEX IF NOT EXISTS idx_users_fee_status ON public.users(fee_status);
  
  RAISE NOTICE 'Fee amount column added successfully';
EXCEPTION WHEN others THEN 
  RAISE NOTICE 'Fee amount column already exists or error occurred';
END $$;

-- ============================================================================
-- SUMMARY OF CHANGES
-- ============================================================================
-- The following columns have been added to the users table:
-- 1. gender (VARCHAR(50)) - Values: 'Male', 'Female'
-- 2. accommodation_type (VARCHAR(100)) - Values: 'Hostel', 'Day Scholar'
-- 3. fee_status (VARCHAR(50)) - Values: 'Paid', 'Pending', 'Overdue'
-- 4. fee_amount (DECIMAL(10,2)) - Numeric value for fee amount
--
-- These columns support the new form fields in:
-- - AddAdminTab: gender field
-- - AddTeacherTab: gender field
-- - StudentRegistrationTab: gender, accommodation_type, fee_status, fee_amount fields
-- ============================================================================
