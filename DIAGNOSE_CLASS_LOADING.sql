-- DIAGNOSE CLASS LOADING ISSUE

-- 1) Check if class_config has data
SELECT 'Total classes in class_config' AS metric, COUNT(*) AS value FROM class_config;

-- 2) Show all classes with all fields
SELECT id, class_name, max_students, current_students, subjects, teacher_id, created_at, updated_at
FROM class_config
ORDER BY class_name;

-- 3) Check student-class distribution
SELECT class, COUNT(*) as student_count
FROM users
WHERE role = 'student'
GROUP BY class
ORDER BY class;

-- 4) Verify class_config matches student classes
SELECT class_name FROM class_config ORDER BY class_name;

-- 5) Count matching classes
SELECT 
  'Classes in class_config' as metric, COUNT(*) as value FROM class_config
UNION ALL
SELECT 'Unique student classes', COUNT(DISTINCT class) FROM users WHERE role = 'student';
