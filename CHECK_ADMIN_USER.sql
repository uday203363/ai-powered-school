-- Check admin user details
SELECT id, register_no, name, role, password, status FROM users WHERE register_no = 'admin' LIMIT 1;

-- Check all users with admin role
SELECT id, register_no, name, role, status FROM users WHERE role = 'admin' ORDER BY register_no LIMIT 5;

-- Check if there are any users at all
SELECT COUNT(*) as total_users FROM users;
SELECT COUNT(*) as admin_count FROM users WHERE role = 'admin';
