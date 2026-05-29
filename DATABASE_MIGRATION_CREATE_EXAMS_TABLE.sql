-- ============================================================================
-- DATABASE MIGRATION: Create Exams Table
-- Run this in Supabase SQL Editor to create the exams table
-- ============================================================================

-- ============================================================================
-- CREATE EXAMS TABLE
-- ============================================================================

DO $$
BEGIN
  CREATE TABLE IF NOT EXISTS public.exams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_name VARCHAR(255) NOT NULL,
    description TEXT,
    exam_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    assessment_type VARCHAR(50) NOT NULL DEFAULT 'formative' CHECK (assessment_type IN ('formative', 'summative')),
    class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE,
    total_marks INTEGER DEFAULT 100,
    passing_marks INTEGER DEFAULT 40,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT TRUE
  );
  
  -- Create indexes for better query performance
  CREATE INDEX IF NOT EXISTS idx_exams_exam_name ON public.exams(exam_name);
  CREATE INDEX IF NOT EXISTS idx_exams_assessment_type ON public.exams(assessment_type);
  CREATE INDEX IF NOT EXISTS idx_exams_class_id ON public.exams(class_id);
  CREATE INDEX IF NOT EXISTS idx_exams_subject_id ON public.exams(subject_id);
  CREATE INDEX IF NOT EXISTS idx_exams_exam_date ON public.exams(exam_date);
  CREATE INDEX IF NOT EXISTS idx_exams_is_active ON public.exams(is_active);
  
  RAISE NOTICE 'Exams table created successfully';
EXCEPTION WHEN others THEN 
  RAISE NOTICE 'Exams table already exists or error occurred: %', SQLERRM;
END $$;

-- ============================================================================
-- VERIFICATION QUERY
-- Uncomment to verify the table structure
-- ============================================================================

-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'exams'
-- ORDER BY ordinal_position;
