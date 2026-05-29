-- See all student records in users table
SELECT id, register_no, name, class, status, admission_year, role 
FROM users 
WHERE role = 'student' 
ORDER BY register_no;

-- Check for NULL values that might hide them
SELECT 
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE class IS NULL) as null_class,
  COUNT(*) FILTER (WHERE status IS NULL) as null_status,
  COUNT(*) FILTER (WHERE status = 'Inactive') as inactive_count
FROM users 
WHERE role = 'student';

-- Check distinct class values
SELECT DISTINCT class FROM users WHERE role = 'student';

-- Check distinct status values
SELECT DISTINCT status FROM users WHERE role = 'student';
