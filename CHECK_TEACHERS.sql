-- Check teachers in database
SELECT 'Total teachers' AS metric, COUNT(*) AS value FROM users WHERE role = 'teacher';

-- Show all teachers with key fields
SELECT id, register_no, name, email, class, status, admission_year, phone
FROM users
WHERE role = 'teacher'
ORDER BY register_no;

-- Check for missing/NULL fields in teachers
SELECT 
  register_no,
  'NULL_status' AS issue
FROM users WHERE role='teacher' AND status IS NULL
UNION ALL
SELECT 
  register_no,
  'NULL_email' AS issue
FROM users WHERE role='teacher' AND email IS NULL
UNION ALL
SELECT 
  register_no,
  'NULL_name' AS issue
FROM users WHERE role='teacher' AND name IS NULL;

-- Show distinct status values for teachers
SELECT DISTINCT status FROM users WHERE role = 'teacher' ORDER BY status;
