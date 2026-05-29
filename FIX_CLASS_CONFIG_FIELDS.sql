-- CHECK CLASS_CONFIG TABLE STRUCTURE AND FIX MISSING FIELDS

-- 1) Check current class_config columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'class_config'
ORDER BY ordinal_position;

-- 2) Show all classes with current data
SELECT * FROM class_config ORDER BY class_name;

-- 3) Add missing columns if needed
ALTER TABLE class_config ADD COLUMN IF NOT EXISTS subjects TEXT;
ALTER TABLE class_config ADD COLUMN IF NOT EXISTS teacher_id UUID;

-- 4) Show class counts by student enrollment
SELECT class_name, COUNT(*) as student_count
FROM users
WHERE role = 'student'
GROUP BY class_name
ORDER BY class_name;

-- 5) Update current_students count from actual student data
UPDATE class_config
SET current_students = (
  SELECT COUNT(*)
  FROM users
  WHERE role = 'student' AND class = class_config.class_name
),
updated_at = now();

-- 6) Verify updated data
SELECT id, class_name, max_students, current_students, subjects, teacher_id, created_at, updated_at
FROM class_config
ORDER BY class_name;
