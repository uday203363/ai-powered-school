-- ASSIGN CLASS TEACHERS - Run this query in Supabase SQL Editor

-- 1) First, view current state
SELECT 'Before Assignment:' as step;
SELECT class_name, COUNT(*) as student_count 
FROM class_config 
GROUP BY class_name 
ORDER BY class_name;

-- 2) Assign each teacher to a class (1 teacher per class)
-- OPTION A: Assign first teacher to first class, second to second, etc.
UPDATE users u1
SET class_teacher_of = (
  SELECT class_name FROM class_config 
  ORDER BY class_name 
  LIMIT 1 OFFSET (
    SELECT COUNT(*) FROM users u2 
    WHERE u2.role = 'teacher' 
    AND u2.register_no <= u1.register_no
  ) - 1
)
WHERE role = 'teacher' 
AND class_teacher_of IS NULL;

-- 3) Alternative: Assign teachers manually (if above doesn't work)
-- Uncomment and modify as needed:
/*
UPDATE users SET class_teacher_of = '10A' WHERE register_no = 'HARINI' AND role = 'teacher';
UPDATE users SET class_teacher_of = '6A' WHERE register_no = 'GREESHU' AND role = 'teacher';
UPDATE users SET class_teacher_of = '7A' WHERE register_no = 'VENKAT' AND role = 'teacher';
UPDATE users SET class_teacher_of = '8A' WHERE register_no = 'SIVA' AND role = 'teacher';
UPDATE users SET class_teacher_of = '9A' WHERE register_no = 'HARI' AND role = 'teacher';
*/

-- 4) Verify assignments
SELECT 'After Assignment:' as step;
SELECT 
  u.register_no, 
  u.name, 
  u.class_teacher_of as "Class Teacher For",
  u.assigned_classes as "Teaches Classes",
  u.status
FROM users u
WHERE u.role = 'teacher'
ORDER BY u.register_no;

-- 5) Show class-wise assignments
SELECT 
  cc.class_name,
  COALESCE(u.name, 'UNASSIGNED') as "Class Teacher",
  COALESCE(u.register_no, '-') as "Teacher Reg No",
  cc.current_students,
  cc.subjects
FROM class_config cc
LEFT JOIN users u ON cc.class_name = u.class_teacher_of AND u.role = 'teacher'
ORDER BY cc.class_name;

-- 6) Count unassigned classes
SELECT COUNT(*) as "Unassigned Classes"
FROM class_config cc
WHERE NOT EXISTS (
  SELECT 1 FROM users u 
  WHERE u.role = 'teacher' 
  AND u.class_teacher_of = cc.class_name
);
