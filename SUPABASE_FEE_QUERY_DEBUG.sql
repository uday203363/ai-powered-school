-- ============================================================================
-- SUPABASE FEE DEBUGGING QUERIES
-- Run these queries in Supabase SQL Editor to check fees data
-- ============================================================================

-- ============================================================================
-- 1. CHECK TABLE STRUCTURE
-- ============================================================================
-- Shows the structure of the fees table
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM 
  information_schema.columns
WHERE 
  table_name = 'fees'
ORDER BY 
  ordinal_position;

-- ============================================================================
-- 2. COUNT TOTAL FEES RECORDS
-- ============================================================================
-- Shows how many fee records exist in total
SELECT COUNT(*) as total_fees FROM public.fees;

-- ============================================================================
-- 3. LIST ALL FEES WITH STUDENT NAMES (CALCULATE BALANCE)
-- ============================================================================
-- Shows all fee records with calculated balance
SELECT 
  f.id,
  f.student_id,
  u.register_no,
  u.name,
  u.class,
  f.month,
  f.year,
  f.total_amount,
  f.paid_amount,
  (f.total_amount - COALESCE(f.paid_amount, 0)) as balance,
  f.status,
  f.created_at
FROM 
  public.fees f
LEFT JOIN 
  public.users u ON f.student_id = u.id
ORDER BY 
  f.created_at DESC;

-- ============================================================================
-- 4. CHECK FEES FOR A SPECIFIC STUDENT (by register_no) - CALCULATE BALANCE
-- ============================================================================
-- REPLACE '26SBPS0010' with the actual student register number
SELECT 
  f.id,
  f.student_id,
  u.register_no,
  u.name,
  u.class,
  f.month,
  f.year,
  f.total_amount,
  f.paid_amount,
  (f.total_amount - COALESCE(f.paid_amount, 0)) as balance,
  f.status,
  f.created_at
FROM 
  public.fees f
LEFT JOIN 
  public.users u ON f.student_id = u.id
WHERE 
  u.register_no = '26SBPS0010'
ORDER BY 
  f.year DESC, f.month DESC;

-- ============================================================================
-- 5. CLASS-WISE FEE SUMMARY (CALCULATE BALANCE)
-- ============================================================================
-- Shows fee statistics by class
SELECT 
  u.class,
  COUNT(DISTINCT u.id) as total_students,
  COUNT(DISTINCT f.id) as total_fee_records,
  COALESCE(SUM(f.total_amount), 0) as total_amount,
  COALESCE(SUM(f.paid_amount), 0) as total_paid,
  COALESCE(SUM(f.total_amount - COALESCE(f.paid_amount, 0)), 0) as total_pending
FROM 
  public.users u
LEFT JOIN 
  public.fees f ON u.id = f.student_id
WHERE 
  u.role = 'student' AND u.status = 'Active'
GROUP BY 
  u.class
ORDER BY 
  u.class;

-- ============================================================================
-- 6. FEES STATUS BREAKDOWN (CALCULATE BALANCE)
-- ============================================================================
-- Shows fees count by status (pending, partial, paid)
SELECT 
  f.status,
  COUNT(*) as count,
  COALESCE(SUM(f.total_amount), 0) as total_amount,
  COALESCE(SUM(f.paid_amount), 0) as total_paid,
  COALESCE(SUM(f.total_amount - COALESCE(f.paid_amount, 0)), 0) as total_pending
FROM 
  public.fees f
GROUP BY 
  f.status
ORDER BY 
  f.status;

-- ============================================================================
-- 7. FEES FOR A SPECIFIC CLASS (CALCULATE BALANCE)
-- ============================================================================
-- REPLACE 'Class A' with the actual class name
SELECT 
  f.id,
  f.student_id,
  u.register_no,
  u.name,
  f.month,
  f.year,
  f.total_amount,
  f.paid_amount,
  (f.total_amount - COALESCE(f.paid_amount, 0)) as balance,
  f.status
FROM 
  public.fees f
LEFT JOIN 
  public.users u ON f.student_id = u.id
WHERE 
  u.class = 'Class A'
ORDER BY 
  u.name, f.year DESC, f.month DESC;

-- ============================================================================
-- 8. FEES WITH BALANCE MISMATCH (CALCULATE CORRECT BALANCE)
-- ============================================================================
-- Shows fees and their calculated balance
SELECT 
  f.id,
  u.register_no,
  u.name,
  f.total_amount,
  f.paid_amount,
  (f.total_amount - COALESCE(f.paid_amount, 0)) as calculated_balance,
  f.status
FROM 
  public.fees f
LEFT JOIN 
  public.users u ON f.student_id = u.id
ORDER BY 
  f.created_at DESC;

-- ============================================================================
-- 9. RECENT FEE ADDITIONS (Last 10) - CALCULATE BALANCE
-- ============================================================================
-- Shows the 10 most recently added fees
SELECT 
  f.id,
  u.register_no,
  u.name,
  u.class,
  f.month,
  f.year,
  f.total_amount,
  f.paid_amount,
  (f.total_amount - COALESCE(f.paid_amount, 0)) as balance,
  f.status,
  f.created_at
FROM 
  public.fees f
LEFT JOIN 
  public.users u ON f.student_id = u.id
ORDER BY 
  f.created_at DESC
LIMIT 10;

-- ============================================================================
-- 10. STUDENTS IN CLASS WITH NO FEES
-- ============================================================================
-- REPLACE 'Class A' with the actual class name
-- Shows students who don't have any fee records yet
SELECT 
  u.id,
  u.register_no,
  u.name,
  u.class,
  u.status
FROM 
  public.users u
WHERE 
  u.class = 'Class A'
  AND u.role = 'student'
  AND u.status = 'Active'
  AND u.id NOT IN (SELECT DISTINCT student_id FROM public.fees)
ORDER BY 
  u.register_no;

-- ============================================================================
-- INSTRUCTIONS:
-- 1. Go to Supabase → Your Project → SQL Editor
-- 2. Copy-paste any query from above
-- 3. REPLACE placeholder values with actual values:
--    - '26SBPS0010' → actual student register number
--    - 'Class A' → actual class name
-- 4. Click "Run" button
-- 5. View results to debug the issue
-- ============================================================================
