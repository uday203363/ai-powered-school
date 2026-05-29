-- Check current teacher assignments
SELECT 
  register_no, 
  name, 
  email, 
  assigned_classes, 
  class_teacher_of
FROM users
WHERE role = 'teacher'
ORDER BY register_no;

-- Check if assigned_classes is populated
SELECT COUNT(*) as teachers_with_assignments
FROM users
WHERE role = 'teacher' AND assigned_classes IS NOT NULL AND assigned_classes != '';

-- Check class_config
SELECT class_name, teacher_id FROM class_config ORDER BY class_name;
