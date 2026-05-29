-- Check students table structure and data
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'students'
ORDER BY ordinal_position;

-- Check how many students in students table
SELECT COUNT(*) as students_count FROM students;

-- See sample student records
SELECT * FROM students LIMIT 3;

-- Check users table structure (specifically student columns)
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'users'
ORDER BY ordinal_position;

-- Check how many students are in users table (with role='student')
SELECT COUNT(*) as users_students_count FROM users WHERE role = 'student';

-- Check if users table has any data at all
SELECT COUNT(*) as total_users FROM users;
