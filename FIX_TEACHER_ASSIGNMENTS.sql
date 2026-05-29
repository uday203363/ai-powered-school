-- ENSURE TEACHER ASSIGNMENTS AND CLASS SUBJECTS ARE POPULATED

-- 1) Ensure teachers have assigned_classes populated
UPDATE users 
SET assigned_classes = (
  SELECT STRING_AGG(class_name, ',') FROM class_config
)
WHERE role = 'teacher' AND (assigned_classes IS NULL OR assigned_classes = '');

-- 2) Ensure class_config has subjects column
ALTER TABLE class_config ADD COLUMN IF NOT EXISTS subjects TEXT;

-- 3) Set default subjects for each class (can be customized later)
UPDATE class_config
SET subjects = 'English, Math, Science, Social Studies'
WHERE subjects IS NULL OR subjects = '';

-- 4) Verify teachers have assignments
SELECT register_no, name, email, assigned_classes, status
FROM users
WHERE role = 'teacher'
ORDER BY register_no;

-- 5) Verify classes have all required fields
SELECT class_name, max_students, current_students, subjects, teacher_id
FROM class_config
ORDER BY class_name;

-- 6) Count complete records
SELECT 
  'Teachers with assignments' as metric, COUNT(*) as value 
FROM users 
WHERE role = 'teacher' AND assigned_classes IS NOT NULL AND assigned_classes != ''
UNION ALL
SELECT 'Classes with subjects', COUNT(*) 
FROM class_config 
WHERE subjects IS NOT NULL AND subjects != '';
