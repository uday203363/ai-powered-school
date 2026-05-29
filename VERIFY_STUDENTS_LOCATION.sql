-- VERIFY WHERE STUDENTS ARE STORED
-- Run this in Supabase SQL Editor and paste results here

-- 1) Counts
SELECT 'students_table_count' as metric, COUNT(*) as value FROM students;
SELECT 'users_table_students_count' as metric, COUNT(*) as value FROM users WHERE role = 'student';

-- 2) Columns
SELECT 'students_columns' as source, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'students'
ORDER BY ordinal_position;

SELECT 'users_columns' as source, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'users'
ORDER BY ordinal_position;

-- 3) Sample rows
SELECT 'students_sample' as source, * FROM students LIMIT 5;
SELECT 'users_students_sample' as source, id, register_no, name, class, status, admission_year FROM users WHERE role = 'student' LIMIT 5;

-- 4) Overlap by register_no (if present)
SELECT
  COUNT(*) FILTER (WHERE s.register_no IS NOT NULL AND u.register_no IS NOT NULL) AS both_have_register_no,
  COUNT(*) FILTER (WHERE s.register_no IS NOT NULL AND u.register_no IS NULL) AS only_in_students_have_register_no,
  COUNT(*) FILTER (WHERE s.register_no IS NULL AND u.register_no IS NOT NULL) AS only_in_users_have_register_no
FROM students s
FULL OUTER JOIN users u ON s.register_no = u.register_no;

-- 5) Rows present only in students (by register_no)
SELECT s.* FROM students s
LEFT JOIN users u ON s.register_no = u.register_no
WHERE u.register_no IS NULL
LIMIT 50;

-- 6) Rows present only in users (students role) not in students
SELECT u.* FROM users u
LEFT JOIN students s ON u.register_no = s.register_no
WHERE u.role = 'student' AND s.register_no IS NULL
LIMIT 50;

-- 7) Distinct class formats in both tables
SELECT 'students_distinct_classes' as source, class, COUNT(*) FROM students GROUP BY class ORDER BY class;
SELECT 'users_distinct_classes' as source, class, COUNT(*) FROM users WHERE role = 'student' GROUP BY class ORDER BY class;
