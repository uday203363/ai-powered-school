-- ============================================================================
-- DATABASE FIX SCRIPT - PRESERVES YOUR EXISTING DATA
-- Only creates missing tables/columns, does NOT insert test data
-- ============================================================================

-- ============================================================================
-- STEP 1: ENSURE ALL REQUIRED TABLES EXIST (without deleting existing data)
-- ============================================================================

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
-- STEP 4: FIX EXISTING DATA ISSUES (without deleting anything)
-- ============================================================================

-- Ensure class column exists before trying to update it
ALTER TABLE users ADD COLUMN IF NOT EXISTS class TEXT;

-- Fix students with missing status (set to 'Active')
UPDATE users 
SET status = 'Active'
WHERE role = 'student' AND status IS NULL;

-- Fix students with missing admission_year
UPDATE users 
SET admission_year = EXTRACT(YEAR FROM CURRENT_DATE)
WHERE role = 'student' AND (admission_year IS NULL OR admission_year = 0);

-- Fix class name format - standardize to "10-A" format
-- If you have "10A", convert to "10-A"
UPDATE users 
SET class = '10-A'
WHERE class IN ('10A', '10a', '10-a') AND role = 'student';

UPDATE users 
SET class = '10-B'
WHERE class IN ('10B', '10b', '10-b') AND role = 'student';

UPDATE users 
SET class = '11-A'
WHERE class IN ('11A', '11a', '11-a') AND role = 'student';

UPDATE users 
SET class = '11-B'
WHERE class IN ('11B', '11b', '11-b') AND role = 'student';

UPDATE users 
SET class = '12-A'
WHERE class IN ('12A', '12a', '12-a') AND role = 'student';

UPDATE users 
SET class = '12-B'
WHERE class IN ('12B', '12b', '12-b') AND role = 'student';

-- ============================================================================
-- STEP 5: VERIFY YOUR DATA IS INTACT
-- ============================================================================

-- Check total users (should match your data)
SELECT COUNT(*) as total_users FROM users;

-- Check users by role
SELECT role, COUNT(*) as count FROM users GROUP BY role;

-- Check students by class
SELECT class, COUNT(*) as count FROM users WHERE role = 'student' GROUP BY class ORDER BY class;

-- Check all your students
SELECT register_no, name, class, status, admission_year FROM users WHERE role = 'student' ORDER BY register_no;

-- Check for any data issues that remain
SELECT 
  'Students with NULL status' as issue, COUNT(*) as count
  FROM users WHERE role = 'student' AND status IS NULL
UNION ALL
SELECT 'Students with NULL class', COUNT(*) 
  FROM users WHERE role = 'student' AND class IS NULL
UNION ALL
SELECT 'Students with NULL admission_year', COUNT(*) 
  FROM users WHERE role = 'student' AND admission_year IS NULL;
