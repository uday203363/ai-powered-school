-- ============================================================================
-- DATABASE MIGRATION - UPDATE EXISTING TEACHER REGISTER NUMBERS
-- Regenerates all existing teacher register numbers in format: TEASBPS0001, TEASBPS0002, etc.
-- Run this in Supabase SQL Editor to update all existing teachers
-- ============================================================================

-- ============================================================================
-- STEP 1: Create temporary sequence table if needed
-- ============================================================================

DO $$
BEGIN
  -- Ensure teacher_register_sequence table exists
  CREATE TABLE IF NOT EXISTS teacher_register_sequence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_code VARCHAR(4) NOT NULL UNIQUE,
    current_sequence INTEGER DEFAULT 0,
    max_sequence INTEGER DEFAULT 9999,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  );
EXCEPTION WHEN others THEN
  NULL;
END $$;

-- ============================================================================
-- STEP 2: Reset teacher sequence
-- ============================================================================

DO $$
BEGIN
  -- Delete existing SBPS sequence
  DELETE FROM teacher_register_sequence WHERE school_code = 'SBPS';
  
  -- Insert fresh sequence starting at 0
  INSERT INTO teacher_register_sequence (school_code, current_sequence, max_sequence, created_at, updated_at)
  VALUES ('SBPS', 0, 9999, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
  
  RAISE NOTICE '✅ Teacher register sequence reset to 0';
EXCEPTION WHEN others THEN
  RAISE NOTICE '⚠️ Error resetting sequence: %', SQLERRM;
END $$;

-- ============================================================================
-- STEP 3: Update all existing teachers with new register numbers
-- ============================================================================

DO $$
DECLARE
  v_sequence INTEGER := 0;
  v_teacher_id UUID;
  v_teacher_name TEXT;
  v_new_register_no VARCHAR;
  v_total_updated INTEGER := 0;
BEGIN
  RAISE NOTICE '🔄 Starting to update teacher register numbers...';
  
  -- Disable any RLS temporarily if it interferes (optional)
  -- Update all existing teachers, ordered by creation time
  FOR v_teacher_id, v_teacher_name IN
    SELECT id, name FROM public.users 
    WHERE role = 'teacher' 
    ORDER BY created_at ASC NULLS LAST
  LOOP
    v_sequence := v_sequence + 1;
    v_new_register_no := 'TEASBPS' || LPAD(v_sequence::TEXT, 4, '0');
    
    -- Update the teacher record
    UPDATE public.users 
    SET 
      register_no = v_new_register_no, 
      updated_at = CURRENT_TIMESTAMP
    WHERE id = v_teacher_id;
    
    v_total_updated := v_total_updated + 1;
    RAISE NOTICE '✅ [%] % → %', v_total_updated, v_teacher_name, v_new_register_no;
  END LOOP;
  
  -- Update the sequence tracker to reflect the next available sequence
  UPDATE teacher_register_sequence 
  SET current_sequence = v_sequence, updated_at = CURRENT_TIMESTAMP
  WHERE school_code = 'SBPS';
  
  RAISE NOTICE '';
  RAISE NOTICE '🎉 COMPLETE! Total teachers updated: %', v_total_updated;
  RAISE NOTICE '📊 Next teacher will get: TEASBPS%', LPAD((v_sequence + 1)::TEXT, 4, '0');

EXCEPTION WHEN others THEN
  RAISE NOTICE '❌ ERROR: %', SQLERRM;
  RAISE NOTICE '💡 Make sure teacher_register_sequence table exists';
END $$;

-- ============================================================================
-- STEP 4: Verify all updates
-- ============================================================================

SELECT 
  '✅ UPDATED' as status,
  name,
  email,
  register_no,
  TO_CHAR(created_at, 'YYYY-MM-DD HH:MI') as created_at
FROM public.users 
WHERE role = 'teacher' 
ORDER BY register_no ASC;

-- Show sequence status
SELECT 
  school_code,
  current_sequence,
  max_sequence,
  TO_CHAR(updated_at, 'YYYY-MM-DD HH:MI') as last_updated
FROM teacher_register_sequence 
WHERE school_code = 'SBPS';
