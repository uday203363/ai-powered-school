-- ============================================================================
-- FIX STATUS CONSTRAINT - Allow Graduated status
-- Run this in Supabase SQL Editor to fix the constraint violation
-- ============================================================================

-- Drop the old constraint and add the new one with Graduated included
ALTER TABLE public.users 
DROP CONSTRAINT IF EXISTS users_status_check;

ALTER TABLE public.users
ADD CONSTRAINT users_status_check 
CHECK (status IN ('Active', 'Inactive', 'Transferred', 'Dropped', 'Left', 'Graduated'));

-- Verify the constraint was created
SELECT constraint_name, constraint_type 
FROM information_schema.table_constraints 
WHERE table_name = 'users' AND constraint_name LIKE '%status%';
