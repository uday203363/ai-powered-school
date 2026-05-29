-- ============================================================================
-- VERIFY FEES DATA AFTER BALANCE COLUMN FIX
-- Run this to confirm everything is working
-- ============================================================================

-- ============================================================================
-- 1. CHECK BALANCE COLUMN EXISTS
-- ============================================================================
SELECT 
  column_name,
  data_type,
  is_nullable
FROM 
  information_schema.columns
WHERE 
  table_name = 'fees' AND column_name = 'balance';

-- ============================================================================
-- 2. COUNT TOTAL FEES
-- ============================================================================
SELECT 
  COUNT(*) as total_fees,
  COUNT(CASE WHEN balance IS NOT NULL THEN 1 END) as fees_with_balance,
  COUNT(CASE WHEN balance = 0 THEN 1 END) as fully_paid_fees
FROM public.fees;

-- ============================================================================
-- 3. LIST ALL FEES (LATEST 20)
-- ============================================================================
SELECT 
  f.id,
  u.register_no,
  u.name,
  u.class,
  f.month,
  f.year,
  f.total_amount,
  f.paid_amount,
  f.balance,
  f.status,
  f.created_at
FROM 
  public.fees f
LEFT JOIN 
  public.users u ON f.student_id = u.id
ORDER BY 
  f.created_at DESC
LIMIT 20;

-- ============================================================================
-- 4. CLASS-WISE FEE SUMMARY
-- ============================================================================
SELECT 
  u.class,
  COUNT(DISTINCT u.id) as students_with_fees,
  COUNT(f.id) as total_fee_records,
  ROUND(COALESCE(SUM(f.total_amount), 0)::numeric, 2) as total_amount,
  ROUND(COALESCE(SUM(f.paid_amount), 0)::numeric, 2) as total_paid,
  ROUND(COALESCE(SUM(f.balance), 0)::numeric, 2) as total_pending
FROM 
  public.users u
LEFT JOIN 
  public.fees f ON u.id = f.student_id
WHERE 
  u.role = 'student' AND u.status = 'Active'
GROUP BY 
  u.class
HAVING COUNT(f.id) > 0
ORDER BY 
  u.class;

-- ============================================================================
-- 5. FEES FOR SPECIFIC STUDENT (REPLACE REGISTER_NO)
-- ============================================================================
-- Change '26SBPS0010' to the actual student register number
SELECT 
  f.id,
  f.student_id,
  u.register_no,
  u.name,
  f.month,
  f.year,
  f.total_amount,
  f.paid_amount,
  f.balance,
  f.status
FROM 
  public.fees f
LEFT JOIN 
  public.users u ON f.student_id = u.id
WHERE 
  u.register_no = '26SBPS0010'
ORDER BY 
  f.year DESC, f.month DESC;
