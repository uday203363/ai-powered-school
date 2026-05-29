-- SAFE SYNC: Merge data from `students` table into `users` table
-- 1) This script backs up `students` (optional, uncomment to run)
-- 2) Inserts missing students into `users`
-- 3) Updates existing `users` rows with missing fields (no destructive overwrites)
-- Run in Supabase SQL Editor inside a transaction

BEGIN;

-- Optional backup (uncomment to enable)
-- CREATE TABLE IF NOT EXISTS students_backup AS TABLE students;

-- Ensure users.register_no unique constraint exists
ALTER TABLE users ADD COLUMN IF NOT EXISTS register_no TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS ux_users_register_no ON users(register_no);

-- Ensure columns we may write exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS class TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Active';
ALTER TABLE users ADD COLUMN IF NOT EXISTS admission_year INTEGER;
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS father_name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS gender TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS date_of_birth TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'student';
ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- Insert or update from students
-- Adjust the source column names (s.register_no, s.name, s.email, ...) if your students table uses different names

INSERT INTO users (register_no, name, email, class, status, admission_year, phone, father_name, gender, date_of_birth, role, created_at, updated_at)
SELECT
  s.register_no,
  s.name,
  s.email,
  s.class,
  'Active' AS status,
  NULL AS admission_year,
  s.phone,
  s.guardian_name AS father_name,
  NULL AS gender,
  NULL AS date_of_birth,
  'student' AS role,
  COALESCE(s.created_at, now()) AS created_at,
  now() AS updated_at
FROM students s
ON CONFLICT (register_no) DO UPDATE SET
  name = COALESCE(users.name, EXCLUDED.name),
  email = COALESCE(users.email, EXCLUDED.email),
  class = COALESCE(users.class, EXCLUDED.class),
  status = COALESCE(users.status, EXCLUDED.status),
  admission_year = COALESCE(users.admission_year, EXCLUDED.admission_year),
  phone = COALESCE(users.phone, EXCLUDED.phone),
  father_name = COALESCE(users.father_name, EXCLUDED.father_name),
  gender = COALESCE(users.gender, EXCLUDED.gender),
  date_of_birth = COALESCE(users.date_of_birth, EXCLUDED.date_of_birth),
  updated_at = now();

-- Verification counts
SELECT 'students_count' as metric, COUNT(*) as value FROM students;
SELECT 'users_students_before_or_after' as metric, COUNT(*) FROM users WHERE role = 'student';

COMMIT;

-- Notes:
-- - If your `students` table uses different column names, edit the SELECT mapping above.
-- - The ON CONFLICT uses `register_no` as the unique key. If your data uses a different unique identifier, change accordingly.
-- - This script will not delete or overwrite non-null values in `users`; it only fills missing fields.
