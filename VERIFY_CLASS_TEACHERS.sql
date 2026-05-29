-- Check current class teacher assignments in database

-- 1) View which teachers are assigned to which classes
SELECT 
  u.register_no,
  u.name,
  u.class_teacher_of as "Class Teacher For",
  u.assigned_classes as "Teaches Classes",
  u.role,
  u.status
FROM users u
WHERE u.role = 'teacher'
ORDER BY u.register_no;

-- 2) Show all classes and their class teachers
SELECT 
  cc.class_name,
  COALESCE(u.name, '❌ NO TEACHER ASSIGNED') as "Class Teacher",
  COALESCE(u.register_no, '-') as "Teacher Reg No",
  cc.current_students,
  cc.subjects
FROM class_config cc
LEFT JOIN users u ON cc.class_name = u.class_teacher_of AND u.role = 'teacher'
ORDER BY cc.class_name;

-- 3) Count assignments
SELECT 
  'Total Classes' as metric, COUNT(*) as count FROM class_config
UNION ALL
SELECT 'Classes with Teachers', COUNT(DISTINCT cc.class_name)
FROM class_config cc
WHERE EXISTS (SELECT 1 FROM users u WHERE u.role = 'teacher' AND u.class_teacher_of = cc.class_name)
UNION ALL
SELECT 'Classes without Teachers', COUNT(DISTINCT cc.class_name)
FROM class_config cc
WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.role = 'teacher' AND u.class_teacher_of = cc.class_name);
