-- ============================================================================
-- FIX MISSING BALANCE COLUMN IN FEES TABLE
-- Run this in Supabase SQL Editor if the balance column is missing
-- ============================================================================

-- ============================================================================
-- STEP 1 & 2: ADD BALANCE COLUMN AND UPDATE VALUES
-- ============================================================================

DO $$
BEGIN
  -- Add balance column if missing
  ALTER TABLE public.fees
  ADD COLUMN IF NOT EXISTS balance DECIMAL(10,2);
  
  RAISE NOTICE 'Balance column added/verified';
  
  -- Update balance for all existing fees
  UPDATE public.fees
  SET balance = (total_amount - COALESCE(paid_amount, 0))
  WHERE balance IS NULL OR balance != (total_amount - COALESCE(paid_amount, 0));
  
  RAISE NOTICE 'Balance values updated for all fees';
EXCEPTION WHEN others THEN 
  RAISE NOTICE 'Error occurred: %', SQLERRM;
END $$;

-- ============================================================================
-- STEP 3: CREATE INDEX ON BALANCE COLUMN FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_fees_balance ON public.fees(balance);

-- ============================================================================
-- STEP 4: VERIFY THE UPDATE
-- ============================================================================
-- Check if balance column exists and values are correct

SELECT 
  'Balance Column Status' as check_type,
  COUNT(*) as total_fees,
  COUNT(CASE WHEN balance IS NOT NULL THEN 1 END) as fees_with_balance,
  COUNT(CASE WHEN balance != (total_amount - COALESCE(paid_amount, 0)) THEN 1 END) as mismatched_balance
FROM public.fees;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

SELECT 'Balance column fix completed successfully!' as status;
