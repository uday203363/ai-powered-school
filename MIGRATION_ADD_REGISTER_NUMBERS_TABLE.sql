-- ============================================================================
-- MIGRATION: Add Register Numbers Tracking Table
-- This table tracks which register numbers are active/inactive
-- ============================================================================

-- Create register_numbers table
CREATE TABLE IF NOT EXISTS register_numbers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  register_no TEXT UNIQUE NOT NULL,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  admission_year INTEGER NOT NULL,
  school_code TEXT NOT NULL,
  status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive', 'Graduated', 'Transferred')),
  marked_inactive_at TIMESTAMP WITH TIME ZONE,
  reason_inactive TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for quick lookups
CREATE INDEX IF NOT EXISTS idx_register_numbers_register_no ON register_numbers(register_no);
CREATE INDEX IF NOT EXISTS idx_register_numbers_student_id ON register_numbers(student_id);
CREATE INDEX IF NOT EXISTS idx_register_numbers_status ON register_numbers(status);
CREATE INDEX IF NOT EXISTS idx_register_numbers_admission_year ON register_numbers(admission_year);

-- Add RLS policies for register_numbers table
ALTER TABLE register_numbers ENABLE ROW LEVEL SECURITY;

-- Policy for admins to see all registers
CREATE POLICY "Allow admins to view all register numbers"
  ON register_numbers FOR SELECT
  USING (auth.jwt() ->> 'role' = 'admin');

-- Policy for students to see their own register
CREATE POLICY "Allow students to view their own register"
  ON register_numbers FOR SELECT
  USING (student_id = auth.uid());

-- Policy for admins to update registers
CREATE POLICY "Allow admins to update register numbers"
  ON register_numbers FOR UPDATE
  USING (auth.jwt() ->> 'role' = 'admin');

-- ============================================================================
-- Populate register_numbers table from existing students
-- ============================================================================

INSERT INTO register_numbers (register_no, student_id, admission_year, school_code, status)
SELECT 
  u.register_no,
  u.id,
  CAST(SUBSTRING(u.register_no, 1, 2) AS INTEGER) + 2000 as admission_year,
  SUBSTRING(u.register_no, 3, 4) as school_code,
  CASE 
    WHEN u.status = 'Graduated' THEN 'Graduated'
    WHEN u.status = 'Transferred' THEN 'Transferred'
    WHEN u.status = 'Active' THEN 'Active'
    ELSE 'Active'
  END as status
FROM users u
WHERE u.register_no IS NOT NULL AND u.role = 'student'
ON CONFLICT (register_no) DO NOTHING;
