-- ============================================================================
-- DATABASE MIGRATION: Replace fee_status with initial_fee and add current_fee
-- Run this in Supabase SQL Editor to update the users table for fee management
-- ============================================================================

-- ============================================================================
-- STEP 1: ADD INITIAL_FEE COLUMN (Fee at joining time)
-- ============================================================================

DO $$
BEGIN
  ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS initial_fee NUMERIC(10,2) DEFAULT 0;
  
  CREATE INDEX IF NOT EXISTS idx_users_initial_fee ON public.users(initial_fee);
  
  RAISE NOTICE 'Initial fee column added successfully';
EXCEPTION WHEN others THEN 
  RAISE NOTICE 'Initial fee column already exists or error occurred';
END $$;

-- ============================================================================
-- STEP 2: ADD CURRENT_FEE COLUMN (Fee after promotions/updates)
-- ============================================================================

DO $$
BEGIN
  ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS current_fee NUMERIC(10,2) DEFAULT 0;
  
  CREATE INDEX IF NOT EXISTS idx_users_current_fee ON public.users(current_fee);
  
  RAISE NOTICE 'Current fee column added successfully';
EXCEPTION WHEN others THEN 
  RAISE NOTICE 'Current fee column already exists or error occurred';
END $$;

-- ============================================================================
-- STEP 3: DROP FEE_STATUS COLUMN (No longer needed)
-- ============================================================================

DO $$
BEGIN
  ALTER TABLE public.users
  DROP COLUMN IF EXISTS fee_status;
  
  RAISE NOTICE 'Fee status column dropped successfully';
EXCEPTION WHEN others THEN 
  RAISE NOTICE 'Fee status column does not exist or error occurred';
END $$;

-- ============================================================================
-- STEP 4: SET CURRENT_FEE = INITIAL_FEE FOR ALL STUDENTS
-- ============================================================================

DO $$
BEGIN
  UPDATE public.users
  SET current_fee = initial_fee
  WHERE role = 'student' AND current_fee = 0 AND initial_fee > 0;
  
  RAISE NOTICE 'Current fee initialized for all students';
EXCEPTION WHEN others THEN 
  RAISE NOTICE 'Error initializing current fee';
END $$;

-- ============================================================================
-- VERIFICATION QUERY
-- Uncomment to verify the changes
-- ============================================================================

-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'users' 
-- AND column_name IN ('initial_fee', 'current_fee', 'fee_status')
-- ORDER BY ordinal_position;
