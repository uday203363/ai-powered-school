-- TEACHER DASHBOARD COMPLETE FIX
-- Populates class_config from student classes and sets up teacher assignments

BEGIN;

-- 1) Auto-populate class_config from distinct student classes
INSERT INTO class_config (class_name, max_students, current_students, created_at, updated_at)
SELECT 
  DISTINCT class AS class_name,
  50 AS max_students,
  COUNT(*) OVER (PARTITION BY class) AS current_students,
  now() AS created_at,
  now() AS updated_at
FROM users
WHERE role = 'student' AND class IS NOT NULL AND class != ''
ON CONFLICT (class_name) DO UPDATE SET
  current_students = EXCLUDED.current_students,
  updated_at = now();

-- 2) Show all class configs now
SELECT 'class_config_after_fix' AS metric, * FROM class_config ORDER BY class_name;

-- 3) Ensure teachers have all required columns
ALTER TABLE users ADD COLUMN IF NOT EXISTS assigned_classes TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS class_teacher_of TEXT;

-- 4) Assign all teachers to all classes (so they can see all student data)
UPDATE users 
SET assigned_classes = (
  SELECT STRING_AGG(class_name, ',') FROM class_config
)
WHERE role = 'teacher' AND assigned_classes IS NULL;

-- 5) Show teachers with their assignments
SELECT id, register_no, name, email, assigned_classes, class_teacher_of, status
FROM users
WHERE role = 'teacher'
ORDER BY register_no;

-- 6) Verify class counts
SELECT 'Total classes created' AS metric, COUNT(*) as value FROM class_config;
SELECT 'Total teachers' AS metric, COUNT(*) as value FROM users WHERE role = 'teacher';

COMMIT;

-- Notes:
-- - Automatically created class configs from distinct student classes (10A, 6A, 7A, 8A, 9A)
-- - Set each class max_students to 50
-- - Assigned all teachers to all classes for now (can reassign individually later)
-- - Teachers can now see all classes in the dashboard
