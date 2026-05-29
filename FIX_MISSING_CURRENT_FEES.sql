-- FIX: Update current_fee for students missing fee records
-- This sets current_fee from initial_fee if current_fee is NULL or 0

UPDATE users
SET current_fee = CASE 
  WHEN initial_fee > 0 THEN initial_fee
  ELSE 50000  -- Default fee if initial_fee is also not set
END
WHERE role = 'student'
  AND status = 'Active'
  AND (current_fee IS NULL OR current_fee = 0)
  AND name IN ('janu', 'raja');

-- Verify the update
SELECT 
  register_no,
  name,
  class,
  initial_fee,
  current_fee,
  'UPDATED ✅' as status
FROM users
WHERE name IN ('janu', 'raja')
  AND role = 'student'
ORDER BY name;