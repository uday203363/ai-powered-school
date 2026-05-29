# 🚀 Database Issues Quick Solutions

## Issue 1: "No students found" or Empty Dashboard

**Symptom:**
- Dashboard loads
- But shows "No students" or "0 students"
- Tables are empty

**Root Cause:**
Database has no student data.

**Quick Fix (30 seconds):**

1. Run this in Supabase SQL Editor:
```sql
-- Copy and paste this entire block and run:

INSERT INTO users (email, name, role, register_no, class, password, status, admission_year)
VALUES 
  ('raj@school.com', 'Raj Kumar', 'student', '24001', '10-A', 'pass', 'Active', 2024),
  ('priya@school.com', 'Priya Singh', 'student', '24002', '10-A', 'pass', 'Active', 2024),
  ('anuj@school.com', 'Anuj Patel', 'student', '24003', '10-B', 'pass', 'Active', 2024),
  ('maya@school.com', 'Maya Sharma', 'student', '24004', '10-B', 'pass', 'Active', 2024)
ON CONFLICT (register_no) DO NOTHING;
```

2. Refresh browser (F5)
3. Should now see 4 students

---

## Issue 2: "Can't Log In"

**Symptom:**
- Try to login
- Get "Invalid credentials"
- Or "User not found"

**Root Cause:**
No admin/user exists in database.

**Quick Fix:**

Run this in Supabase SQL Editor:
```sql
INSERT INTO users (email, name, role, register_no, password)
VALUES ('admin@school.com', 'Admin User', 'admin', 'admin', 'admin123')
ON CONFLICT (register_no) DO NOTHING;
```

Then login with:
- Register No: `admin`
- Password: `admin123`

---

## Issue 3: "Data in Database but Not Showing in Dashboard"

**Symptom:**
- Database has students (you can see them in Supabase)
- But dashboard shows empty

**Root Cause:**
One of these:
1. Students have NULL class field
2. Class name format is wrong (10A vs 10-A)
3. Students have NULL or "Inactive" status
4. Backend not running

**Quick Fix:**

### A. Check Backend is Running
```
Open terminal
cd backend
npm run dev
Wait for: "School Management Backend Started"
```

### B. Fix Student Data

Run this in Supabase SQL Editor:
```sql
-- Set status to Active
UPDATE users SET status = 'Active' WHERE role = 'student' AND status IS NULL;

-- Fix class name format (if needed)
UPDATE users SET class = '10-A' WHERE class = '10A';
UPDATE users SET class = '10-B' WHERE class = '10B';

-- Set admission year (if needed)
UPDATE users SET admission_year = 2024 WHERE role = 'student' AND admission_year IS NULL;

-- Verify
SELECT register_no, name, class, status FROM users WHERE role = 'student';
```

3. Refresh browser
4. Should now see students

---

## Issue 4: "Class Filter Shows 0 Students"

**Symptom:**
- Can see total students
- But clicking "10-A" shows 0 students
- Even though students exist

**Root Cause:**
Class name mismatch in database vs filter.

**Example:**
```
Database has: "10A" or "10a" or "10-a"
Filter expects: "10-A"
Result: No match!
```

**Quick Fix:**

Standardize class names:
```sql
-- Fix all class name formats to standard: "10-A"
UPDATE users SET class = '10-A' WHERE class IN ('10A', '10a', '10-a');
UPDATE users SET class = '10-B' WHERE class IN ('10B', '10b', '10-b');
UPDATE users SET class = '11-A' WHERE class IN ('11A', '11a', '11-a');
UPDATE users SET class = '11-B' WHERE class IN ('11B', '11b', '11-b');
UPDATE users SET class = '12-A' WHERE class IN ('12A', '12a', '12-a');
UPDATE users SET class = '12-B' WHERE class IN ('12B', '12b', '12-b');

-- Verify
SELECT DISTINCT class FROM users WHERE role = 'student' ORDER BY class;
```

---

## Issue 5: RLS (Row Level Security) Errors

**Symptom:**
```
Error: new row violates row-level security policy
Error: permission denied for schema public
```

**Root Cause:**
RLS policies are blocking access.

**Quick Fix:**

Run this in Supabase SQL Editor:
```sql
-- Temporarily disable RLS
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE marks DISABLE ROW LEVEL SECURITY;
ALTER TABLE attendance DISABLE ROW LEVEL SECURITY;
ALTER TABLE fees DISABLE ROW LEVEL SECURITY;
ALTER TABLE exams DISABLE ROW LEVEL SECURITY;
```

Then try to add/view data again.

---

## Issue 6: "Tables Don't Exist"

**Symptom:**
```
Error: relation "marks" does not exist
Error: relation "attendance" does not exist
```

**Root Cause:**
Migration scripts were never run.

**Quick Fix:**

Run the complete fix script:
```
In Supabase SQL Editor, run:
FIX_DATABASE_ISSUES.sql (copy entire file and paste)
```

This creates all missing tables automatically.

---

## Issue 7: "Duplicate Key Error"

**Symptom:**
```
Error: duplicate key value violates unique constraint
```

**Root Cause:**
Trying to insert data that already exists.

**Quick Fix:**

Add `ON CONFLICT ... DO NOTHING` to insert statements:

**Before (will error):**
```sql
INSERT INTO users (register_no, name, role)
VALUES ('24001', 'John', 'student');
-- Error if 24001 already exists
```

**After (will skip duplicate):**
```sql
INSERT INTO users (register_no, name, role)
VALUES ('24001', 'John', 'student')
ON CONFLICT (register_no) DO NOTHING;
-- Silently skips if 24001 already exists
```

---

## Issue 8: "Missing Columns"

**Symptom:**
```
Error: column "class" does not exist
Error: column "status" does not exist
```

**Root Cause:**
Required columns were never added to users table.

**Quick Fix:**

Add missing columns:
```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS class TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Active';
ALTER TABLE users ADD COLUMN IF NOT EXISTS register_no TEXT UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS first_login BOOLEAN DEFAULT TRUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS admission_year INTEGER;
ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'student';
```

---

## Issue 9: "Slow Queries"

**Symptom:**
- Dashboard loads very slowly
- Filtering takes 10+ seconds

**Root Cause:**
Missing database indexes.

**Quick Fix:**

Create indexes:
```sql
CREATE INDEX IF NOT EXISTS idx_users_register_no ON users(register_no);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_class ON users(class);
CREATE INDEX IF NOT EXISTS idx_marks_student_id ON marks(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_student_id ON attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_fees_student_id ON fees(student_id);
```

---

## Issue 10: "Data Shows but Marks/Attendance/Fees Don't"

**Symptom:**
- Students show in dashboard
- But marks, attendance, fees tabs show nothing

**Root Cause:**
Those tables exist but are empty OR have wrong student_id references.

**Quick Fix:**

### Check if tables exist:
```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('marks', 'attendance', 'fees');
```

### If tables don't exist, create them:
```sql
-- From FIX_DATABASE_ISSUES.sql
-- Just copy the CREATE TABLE sections for those specific tables
```

### If tables exist but empty, add sample data:
```sql
-- Get a student ID first
SELECT id, register_no FROM users WHERE role = 'student' LIMIT 1;

-- Then insert marks
INSERT INTO marks (student_id, subject, marks, total, class)
VALUES ('PASTE_STUDENT_ID_HERE', 'Math', 85, 100, '10-A');

-- Or use register_no to find student
INSERT INTO marks (student_id, subject, marks, total, class)
SELECT id, 'English', 90, 100, '10-A'
FROM users WHERE register_no = '24001';
```

---

## Complete Database Diagnostic

To check everything at once, run this:

```sql
-- Count everything
SELECT 'Total Users' as metric, COUNT(*) as value FROM users
UNION ALL
SELECT 'Admins', COUNT(*) FROM users WHERE role = 'admin'
UNION ALL
SELECT 'Teachers', COUNT(*) FROM users WHERE role = 'teacher'
UNION ALL
SELECT 'Students', COUNT(*) FROM users WHERE role = 'student'
UNION ALL
SELECT 'Marks Records', COUNT(*) FROM marks
UNION ALL
SELECT 'Attendance Records', COUNT(*) FROM attendance
UNION ALL
SELECT 'Fee Records', COUNT(*) FROM fees
UNION ALL
SELECT 'Exams', COUNT(*) FROM exams;

-- List all students with details
SELECT register_no, name, class, status, admission_year
FROM users
WHERE role = 'student'
ORDER BY register_no;

-- Check for issues
SELECT 'Missing Status' as issue, COUNT(*) FROM users WHERE role = 'student' AND status IS NULL
UNION ALL
SELECT 'Missing Class', COUNT(*) FROM users WHERE role = 'student' AND class IS NULL
UNION ALL
SELECT 'Missing Admission Year', COUNT(*) FROM users WHERE role = 'student' AND admission_year IS NULL;
```

---

## One-Command Complete Fix

Copy and paste this entire block in Supabase SQL Editor to fix everything:

```sql
-- Create all tables
CREATE TABLE IF NOT EXISTS marks (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, subject TEXT NOT NULL, marks DECIMAL(5,2) NOT NULL, total DECIMAL(5,2) DEFAULT 100, exam_type TEXT DEFAULT 'Monthly', month TEXT, year INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_DATE), class TEXT, created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS attendance (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, date DATE NOT NULL, status TEXT CHECK (status IN ('Present', 'Absent', 'Late', 'Excused')), remarks TEXT, class TEXT, created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP, UNIQUE(student_id, date));
CREATE TABLE IF NOT EXISTS fees (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, amount DECIMAL(10,2) NOT NULL, due_date DATE, paid_date DATE, status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'Paid', 'Overdue', 'Partial')), payment_method TEXT, remarks TEXT, class TEXT, admission_year INTEGER, created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS exams (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), exam_name TEXT NOT NULL, exam_type TEXT NOT NULL, class TEXT NOT NULL, date DATE, year INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_DATE), created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP);

-- Add columns to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'student';
ALTER TABLE users ADD COLUMN IF NOT EXISTS register_no TEXT UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS class TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Active';
ALTER TABLE users ADD COLUMN IF NOT EXISTS admission_year INTEGER;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password TEXT;

-- Insert admin
INSERT INTO users (email, name, role, register_no, password) VALUES ('admin@school.com', 'Admin', 'admin', 'admin', 'admin123') ON CONFLICT (register_no) DO NOTHING;

-- Insert students
INSERT INTO users (email, name, role, register_no, class, password, status, admission_year) VALUES 
  ('s1@school.com', 'Raj Kumar', 'student', '24001', '10-A', 'pwd', 'Active', 2024),
  ('s2@school.com', 'Priya Singh', 'student', '24002', '10-A', 'pwd', 'Active', 2024),
  ('s3@school.com', 'Anuj Patel', 'student', '24003', '10-B', 'pwd', 'Active', 2024),
  ('s4@school.com', 'Maya Sharma', 'student', '24004', '10-B', 'pwd', 'Active', 2024)
ON CONFLICT (register_no) DO NOTHING;

-- Fix data
UPDATE users SET status = 'Active' WHERE role = 'student' AND status IS NULL;
UPDATE users SET admission_year = 2024 WHERE role = 'student' AND admission_year IS NULL;

-- Verify
SELECT register_no, name, class, status FROM users WHERE role = 'student';
```

Done! You should now see 4 students with all required data. ✅

