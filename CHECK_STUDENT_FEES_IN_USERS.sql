-- ============================================================================
-- CHECK FEES STORED IN USERS TABLE (DURING REGISTRATION)
-- Run this to see fees added during student registration
-- ============================================================================

-- ============================================================================
-- 1. CHECK USERS TABLE COLUMNS FOR FEE FIELDS
-- ============================================================================
SELECT 
  column_name,
  data_type,
  is_nullable
FROM 
  information_schema.columns
WHERE 
  table_name = 'users' 
  AND (column_name LIKE '%fee%' OR column_name LIKE '%charge%' OR column_name LIKE '%amount%')
ORDER BY 
  ordinal_position;

-- ============================================================================
-- 2. LIST ALL STUDENTS WITH FEES (FROM USERS TABLE)
-- ============================================================================
SELECT 
  id,
  register_no,
  name,
  class,
  initial_fee,
  current_fee,
  status,
  created_at
FROM 
  public.users
WHERE 
  role = 'student'
  AND status = 'Active'
  AND (initial_fee > 0 OR current_fee > 0)
ORDER BY 
  class, register_no;

-- ============================================================================
-- 3. SPECIFIC STUDENT FEES (REPLACE REGISTER_NO)
-- ============================================================================
-- Change '26SBPS0010' to actual register number
SELECT 
  id,
  register_no,
  name,
  class,
  initial_fee,
  current_fee,
  (current_fee - 0) as total_amount,
  0 as paid_amount,
  (current_fee - 0) as balance,
  'pending' as status
FROM 
  public.users
WHERE 
  register_no = '26SBPS0010';

-- ============================================================================
-- 4. CLASS-WISE FEE SUMMARY (FROM USERS TABLE)
-- ============================================================================
SELECT 
  class,
  COUNT(*) as total_students,
  COUNT(CASE WHEN current_fee > 0 THEN 1 END) as students_with_fees,
  ROUND(COALESCE(SUM(current_fee), 0)::numeric, 2) as total_fees,
  ROUND(COALESCE(AVG(current_fee), 0)::numeric, 2) as avg_fee_per_student
FROM 
  public.users
WHERE 
  role = 'student'
  AND status = 'Active'
GROUP BY 
  class
HAVING SUM(current_fee) > 0
ORDER BY 
  class;

-- ============================================================================
-- 5. COMPARE FEES TABLE VS USERS TABLE
-- ============================================================================
SELECT 
  'Fees Table' as source,
  COUNT(*) as total_records,
  COALESCE(SUM(total_amount), 0) as total_amount
FROM 
  public.fees

UNION ALL

SELECT 
  'Users Table' as source,
  COUNT(*) as total_records,
  COALESCE(SUM(current_fee), 0) as total_amount
FROM 
  public.users
WHERE 
  role = 'student';
