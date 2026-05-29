-- ============================================================================
-- DIAGNOSTIC: Check existing tables and errors
-- Run this to see what tables exist and diagnose the issue
-- ============================================================================

-- Check what tables exist in public schema
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- Check if exams table exists and its structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'exams'
ORDER BY ordinal_position;

-- Check if classes table exists
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'classes'
ORDER BY ordinal_position;

-- Check if subjects table exists
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'subjects'
ORDER BY ordinal_position;
