-- Create exams table for managing class-wise exams
CREATE TABLE IF NOT EXISTS exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_name VARCHAR(255) NOT NULL,
  class_name VARCHAR(50) NOT NULL,
  exam_number INTEGER NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- Unique constraint to prevent duplicate exams for same class
  CONSTRAINT unique_exam_per_class UNIQUE(class_name, exam_number, exam_name)
);

-- Create index for faster queries
CREATE INDEX idx_exams_class_name ON exams(class_name);
CREATE INDEX idx_exams_is_active ON exams(is_active);
CREATE INDEX idx_exams_class_active ON exams(class_name, is_active);

-- Add RLS policies for exams table
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;

-- Admin can manage all exams
CREATE POLICY exams_admin_all ON exams
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'admin' OR (SELECT role FROM users WHERE id = auth.uid()) = 'admin')
  WITH CHECK (auth.jwt() ->> 'role' = 'admin' OR (SELECT role FROM users WHERE id = auth.uid()) = 'admin');

-- Teachers can only view active exams
CREATE POLICY exams_teacher_select ON exams
  FOR SELECT
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) IN ('teacher', 'admin')
    AND is_active = true
  );

-- Students can only view active exams
CREATE POLICY exams_student_select ON exams
  FOR SELECT
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) IN ('student', 'admin')
    AND is_active = true
  );

-- Insert sample exams for testing (optional)
INSERT INTO exams (exam_name, class_name, exam_number, description, is_active)
VALUES
  ('Final Exam', '10A', 1, 'Term End Final Exam', true),
  ('Mid Term', '10A', 2, 'Mid-Semester Exam', true),
  ('Quiz 1', '10A', 3, 'Weekly Quiz', true),
  ('Final Exam', '10B', 1, 'Term End Final Exam', true),
  ('Mid Term', '10B', 2, 'Mid-Semester Exam', true),
  ('Final Exam', '9A', 1, 'Term End Final Exam', true)
ON CONFLICT (class_name, exam_number, exam_name) DO NOTHING;
