-- ============================================================================
-- DATABASE MIGRATION FOR TEACHER REGISTER NUMBER SEQUENCING
-- Run this in Supabase SQL Editor to create teacher register sequence table
-- ============================================================================

-- ============================================================================
-- CREATE TEACHER REGISTER SEQUENCE TABLE
-- Format: TEA{4-LETTER-SCHOOL-CODE}{4-DIGIT-SEQUENCE}
-- Example: TEASBPS0001, TEASBPS0002, etc.
-- ============================================================================

DO $$
BEGIN
  CREATE TABLE IF NOT EXISTS teacher_register_sequence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_code VARCHAR(3) NOT NULL,
    current_sequence INTEGER DEFAULT 0,
    max_sequence INTEGER DEFAULT 9999,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(school_code)
  );
  
  RAISE NOTICE 'teacher_register_sequence table created successfully';
EXCEPTION WHEN others THEN
  RAISE NOTICE 'teacher_register_sequence table already exists or error occurred: %', SQLERRM;
END $$;

-- Create index for faster lookups
DO $$
BEGIN
  CREATE INDEX IF NOT EXISTS idx_teacher_register_sequence_school_code 
  ON teacher_register_sequence(school_code);
  RAISE NOTICE 'Index created successfully';
EXCEPTION WHEN others THEN
  RAISE NOTICE 'Index already exists or error occurred';
END $$;

-- Initialize default sequences for common school codes
DO $$
BEGIN
  INSERT INTO teacher_register_sequence (school_code, current_sequence, max_sequence)
  VALUES 
    ('SBPS', 0, 9999)
  ON CONFLICT (school_code) DO NOTHING;
  RAISE NOTICE 'Default school codes initialized';
EXCEPTION WHEN others THEN
  RAISE NOTICE 'Error initializing sequences: %', SQLERRM;
END $$;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify table was created
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'teacher_register_sequence';

-- Check current sequences
SELECT school_code, current_sequence, max_sequence, created_at, updated_at 
FROM teacher_register_sequence 
ORDER BY school_code;
