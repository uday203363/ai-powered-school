-- ============================================
-- FIX CLASS STRENGTH - Recalculate accurate counts
-- ============================================
-- This script will recalculate the current_students count in class_config
-- based on the actual number of Active students in the users table

-- Step 1: Update class_config with actual student counts
UPDATE public.class_config cc
SET current_students = (
        SELECT COUNT(*) 
        FROM public.users u
        WHERE u.class = cc.class_name 
            AND u.role = 'student' 
            AND u.status = 'Active'
),
updated_at = CURRENT_TIMESTAMP;

-- Step 2: Verify the updates - show the results
SELECT 
    class_name,
    max_students,
    current_students,
    (max_students - current_students) as available_seats,
    CASE 
        WHEN current_students >= max_students THEN '❌ FULL'
        WHEN current_students > (max_students * 0.8) THEN '⚠️ NEAR FULL'
        ELSE '✅ AVAILABLE'
    END as status
FROM public.class_config
ORDER BY class_name;

-- Step 3: Show detailed breakdown of students per class
SELECT 
    class,
    COUNT(*) as total_students,
    COUNT(CASE WHEN status = 'Active' THEN 1 END) as active_students,
    COUNT(CASE WHEN status != 'Active' THEN 1 END) as inactive_students
FROM public.users
WHERE role = 'student'
GROUP BY class
ORDER BY class;
