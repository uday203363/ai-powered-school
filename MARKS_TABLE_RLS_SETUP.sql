-- ============================================================================
-- SUPABASE RLS POLICIES FOR MARKS TABLE
-- ============================================================================
-- Run this in Supabase SQL Editor to set up proper Row Level Security
-- This allows teachers to insert, update, view marks
-- and students to view their own marks

-- First, check current RLS status
-- SELECT tablename, rowsecurity FROM pg_tables 
-- WHERE tablename = 'marks'
-- AND schemaname = 'public';


-- ============================================================================
-- SETUP: Enable RLS on marks table
-- ============================================================================
ALTER TABLE public.marks ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "marks_teacher_insert" ON public.marks;
DROP POLICY IF EXISTS "marks_teacher_select" ON public.marks;
DROP POLICY IF EXISTS "marks_teacher_update" ON public.marks;
DROP POLICY IF EXISTS "marks_student_select" ON public.marks;
DROP POLICY IF EXISTS "marks_admin_all" ON public.marks;


-- ============================================================================
-- POLICY 1: Allow teachers to insert marks
-- ============================================================================
CREATE POLICY "marks_teacher_insert" ON public.marks
FOR INSERT TO authenticated
WITH CHECK (
    -- Teacher must exist in users table
    auth.uid() IN (
        SELECT id FROM public.users 
        WHERE role = 'teacher'
    )
);


-- ============================================================================
-- POLICY 2: Allow teachers to view all marks (they filter by subject in app)
-- ============================================================================
CREATE POLICY "marks_teacher_select" ON public.marks
FOR SELECT TO authenticated
USING (
    auth.uid() IN (
        SELECT id FROM public.users 
        WHERE role = 'teacher'
    )
    OR 
    auth.uid() IN (
        SELECT id FROM public.users 
        WHERE role = 'admin'
    )
);


-- ============================================================================
-- POLICY 3: Allow teachers to update marks
-- ============================================================================
CREATE POLICY "marks_teacher_update" ON public.marks
FOR UPDATE TO authenticated
USING (
    auth.uid() IN (
        SELECT id FROM public.users 
        WHERE role = 'teacher'
    )
);


-- ============================================================================
-- POLICY 4: Allow students to view their own marks
-- ============================================================================
CREATE POLICY "marks_student_select" ON public.marks
FOR SELECT TO authenticated
USING (
    -- Student can see their own marks
    student_id = auth.uid()
);


-- ============================================================================
-- VERIFICATION: Check if policies are created
-- ============================================================================
-- Uncomment to verify:
-- SELECT schemaname, tablename, policyname, permissive, roles, qual, with_check
-- FROM pg_policies
-- WHERE tablename = 'marks'
-- ORDER BY policyname;
