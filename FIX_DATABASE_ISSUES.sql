-- ============================================================================
-- DATABASE FIX & REPAIR SCRIPT
-- Run this in Supabase SQL Editor to fix common database issues
-- ============================================================================

-- ============================================================================
-- STEP 1: ENSURE ALL REQUIRED TABLES EXIST
-- ============================================================================

-- Create users table if it doesn't exist (Supabase auth table)
-- Note: users table is created automatically by Supabase

-- Create marks table
CREATE TABLE IF NOT EXISTS marks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  marks DECIMAL(5,2) NOT NULL,
  total DECIMAL(5,2) DEFAULT 100,
  exam_type TEXT DEFAULT 'Monthly',
  month TEXT,
  year INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
  class TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create attendance table
CREATE TABLE IF NOT EXISTS attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status TEXT CHECK (status IN ('Present', 'Absent', 'Late', 'Excused')),
  remarks TEXT,
  class TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(student_id, date)
);

-- Create fees table
CREATE TABLE IF NOT EXISTS fees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  due_date DATE,
  paid_date DATE,
  status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'Paid', 'Overdue', 'Partial')),
  payment_method TEXT,
  remarks TEXT,
  class TEXT,
  admission_year INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create exams table
CREATE TABLE IF NOT EXISTS exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_name TEXT NOT NULL,
  exam_type TEXT NOT NULL,
  class TEXT NOT NULL,
  date DATE,
  year INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create classes table
CREATE TABLE IF NOT EXISTS classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_name TEXT UNIQUE NOT NULL,
  section TEXT,
  teacher_id UUID REFERENCES users(id),
  max_students INTEGER DEFAULT 50,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create class_config table
CREATE TABLE IF NOT EXISTS class_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_name TEXT UNIQUE NOT NULL,
  max_students INTEGER NOT NULL,
  current_students INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- STEP 2: ENSURE ALL REQUIRED COLUMNS EXIST IN USERS TABLE
-- ============================================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'student';
ALTER TABLE users ADD COLUMN IF NOT EXISTS register_no TEXT UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS class TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS first_login BOOLEAN DEFAULT TRUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS father_name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS gender TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS admission_year INTEGER;
ALTER TABLE users ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive', 'Transferred', 'Dropped', 'Left', 'Graduated'));
ALTER TABLE users ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS parent_email TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS parent_phone TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS date_of_birth TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS accommodation_type TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS initial_fee DECIMAL(10,2) DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS current_fee DECIMAL(10,2) DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS assigned_classes TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS subjects TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS class_teacher_of TEXT;

-- ============================================================================
-- STEP 3: CREATE INDEXES FOR BETTER PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_users_register_no ON users(register_no);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_class ON users(class);
CREATE INDEX IF NOT EXISTS idx_marks_student_id ON marks(student_id);
CREATE INDEX IF NOT EXISTS idx_marks_subject ON marks(subject);
CREATE INDEX IF NOT EXISTS idx_marks_class ON marks(class);
CREATE INDEX IF NOT EXISTS idx_attendance_student_id ON attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);
CREATE INDEX IF NOT EXISTS idx_fees_student_id ON fees(student_id);
CREATE INDEX IF NOT EXISTS idx_fees_status ON fees(status);
CREATE INDEX IF NOT EXISTS idx_exams_class ON exams(class);

-- ============================================================================
-- STEP 4: INSERT TEST DATA IF USERS TABLE IS EMPTY
-- ============================================================================

-- Insert admin user if it doesn't exist
INSERT INTO users (email, name, role, register_no, password, first_login)
SELECT 'admin@school.com', 'Admin User', 'admin', 'admin', 'admin123', FALSE
WHERE NOT EXISTS (SELECT 1 FROM users WHERE register_no = 'admin');

-- Insert test students if students table is empty
INSERT INTO users (email, name, role, register_no, class, password, first_login, admission_year, status)
SELECT 'student1@school.com', 'Raj Kumar', 'student', '24001', '10-A', 'password123', FALSE, 2024, 'Active'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE register_no = '24001');

INSERT INTO users (email, name, role, register_no, class, password, first_login, admission_year, status)
SELECT 'student2@school.com', 'Priya Singh', 'student', '24002', '10-A', 'password123', FALSE, 2024, 'Active'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE register_no = '24002');

INSERT INTO users (email, name, role, register_no, class, password, first_login, admission_year, status)
SELECT 'student3@school.com', 'Anuj Patel', 'student', '24003', '10-B', 'password123', FALSE, 2024, 'Active'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE register_no = '24003');

INSERT INTO users (email, name, role, register_no, class, password, first_login, admission_year, status)
SELECT 'student4@school.com', 'Maya Sharma', 'student', '24004', '10-B', 'password123', FALSE, 2024, 'Active'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE register_no = '24004');

INSERT INTO users (email, name, role, register_no, class, password, first_login, admission_year, status)
SELECT 'teacher1@school.com', 'Mr. Gupta', 'teacher', 'T001', NULL, 'password123', FALSE, 2024, 'Active'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE register_no = 'T001');

-- ============================================================================
-- STEP 5: ENSURE ALL TABLES ARE READABLE (FIX RLS IF NEEDED)
-- ============================================================================

-- Check if RLS is enabled on users table
-- If data is not showing, disable RLS with:
-- ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Check if RLS is enabled on marks table
-- ALTER TABLE marks DISABLE ROW LEVEL SECURITY;

-- Check if RLS is enabled on attendance table
-- ALTER TABLE attendance DISABLE ROW LEVEL SECURITY;

-- Check if RLS is enabled on fees table
-- ALTER TABLE fees DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 6: FIX COMMON DATA ISSUES
-- ============================================================================

-- Ensure all students have admission_year set
UPDATE users 
SET admission_year = EXTRACT(YEAR FROM CURRENT_DATE)
WHERE role = 'student' AND (admission_year IS NULL OR admission_year = 0);

-- Ensure all students have status set to 'Active'
UPDATE users 
SET status = 'Active'
WHERE role = 'student' AND status IS NULL;

-- Ensure class names are in correct format (uppercase with hyphen)
-- For example, convert "10A" to "10-A", "10a" to "10-A"
UPDATE users 
SET class = '10-A'
WHERE class IN ('10A', '10a', '10-a');

UPDATE users 
SET class = '10-B'
WHERE class IN ('10B', '10b', '10-b');

UPDATE users 
SET class = '11-A'
WHERE class IN ('11A', '11a', '11-a');

-- ============================================================================
-- STEP 7: VERIFY DATA IS ACCESSIBLE
-- ============================================================================

-- Check total users
SELECT COUNT(*) as total_users FROM users;

-- Check users by role
SELECT role, COUNT(*) as count FROM users GROUP BY role;

-- Check students by class
SELECT class, COUNT(*) as count FROM users WHERE role = 'student' GROUP BY class;

-- Check all students
SELECT register_no, name, class, status, admission_year FROM users WHERE role = 'student' ORDER BY register_no;
