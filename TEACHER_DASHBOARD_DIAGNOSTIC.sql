-- TEACHER DASHBOARD DIAGNOSTIC
-- Run all these queries to see what's missing

-- 1) Count classes in class_config table
SELECT 'class_config_count' AS metric, COUNT(*) AS value FROM class_config;

-- 2) Show all class configs
SELECT * FROM class_config LIMIT 20;

-- 3) Count classes in classes table
SELECT 'classes_count' AS metric, COUNT(*) AS value FROM classes;

-- 4) Show all classes
SELECT * FROM classes LIMIT 20;

-- 5) Check teachers data
SELECT id, register_no, name, email, assigned_classes, class_teacher_of, status
FROM users
WHERE role = 'teacher'
LIMIT 20;

-- 6) Check if class_teachers table exists
SELECT EXISTS (
  SELECT 1 FROM information_schema.tables 
  WHERE table_schema = 'public' AND table_name = 'class_teachers'
) AS class_teachers_exists;

-- 7) If class_teachers table exists, show contents
-- SELECT * FROM class_teachers LIMIT 20;

-- 8) Count unique classes from students
SELECT DISTINCT class FROM users WHERE role = 'student' ORDER BY class;

-- 9) Show which tables have class-related data
SELECT table_name, column_name
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND (column_name LIKE '%class%' OR column_name LIKE '%teacher%')
ORDER BY table_name, ordinal_position;
