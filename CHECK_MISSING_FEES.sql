-- CHECK STUDENT FEE DATA
-- This query checks which students are missing current_fee

SELECT 
  id,
  register_no,
  name,
  class,
  initial_fee,
  current_fee,
  status,
  CASE 
    WHEN current_fee IS NULL OR current_fee = 0 THEN '❌ NO CURRENT FEE'
    ELSE '✅ HAS FEE: ₹' || current_fee
  END as fee_status
FROM users
WHERE name IN ('janu', 'raja')
  AND role = 'student'
ORDER BY name;

-- Also check if they have fee records in the fees table
SELECT 
  f.student_id,
  u.name,
  u.register_no,
  COUNT(f.id) as fee_count,
  STRING_AGG(f.month || '/' || f.year, ', ') as months
FROM fees f
RIGHT JOIN users u ON f.student_id = u.id
WHERE u.name IN ('janu', 'raja')
  AND u.role = 'student'
GROUP BY f.student_id, u.name, u.register_no
ORDER BY u.name;