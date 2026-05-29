-- ======================================
-- FIX: Disable RLS on student_register_sequence
-- This table is internal and should allow authenticated users to read/write
-- ======================================

-- Disable RLS on this system table
ALTER TABLE public.student_register_sequence DISABLE ROW LEVEL SECURITY;

-- Or alternatively, enable it with a permissive policy:
-- DROP POLICY IF EXISTS allow_all_authenticated ON public.student_register_sequence;
-- CREATE POLICY allow_all_authenticated ON public.student_register_sequence
--   FOR ALL USING (TRUE) WITH CHECK (TRUE);

-- Verify the change
SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'student_register_sequence';
