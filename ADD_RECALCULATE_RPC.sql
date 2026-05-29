-- ============================================
-- CREATE RECALCULATE CLASS COUNTS RPC FUNCTION
-- ============================================
-- This RPC function can be called from the application to recalculate counts

CREATE OR REPLACE FUNCTION recalculate_class_counts()
RETURNS TABLE (
    class_name TEXT,
    previous_count INTEGER,
    new_count INTEGER,
    difference INTEGER
) AS $$
DECLARE
    v_class_rec RECORD;
    v_new_count INTEGER;
    v_prev_count INTEGER;
BEGIN
    -- Loop through all classes
    FOR v_class_rec IN SELECT DISTINCT public.class_config.class_name FROM public.class_config
    LOOP
        -- Get previous count
        SELECT cc.current_students INTO v_prev_count
        FROM public.class_config cc
        WHERE cc.class_name = v_class_rec.class_name;
        
        -- Calculate actual count
        SELECT COUNT(*) INTO v_new_count
        FROM public.users
        WHERE public.users.class = v_class_rec.class_name
          AND public.users.role = 'student'
          AND public.users.status = 'Active';
        
        -- Update if different
        IF v_new_count IS DISTINCT FROM v_prev_count THEN
            UPDATE public.class_config cc
            SET current_students = v_new_count,
                updated_at = CURRENT_TIMESTAMP
            WHERE cc.class_name = v_class_rec.class_name;
            
            RETURN QUERY SELECT 
                v_class_rec.class_name,
                v_prev_count,
                v_new_count,
                (v_new_count - COALESCE(v_prev_count, 0))::INTEGER;
        END IF;
    END LOOP;
    
    -- Also process any classes in users table that don't have class_config entry
    FOR v_class_rec IN 
                SELECT DISTINCT u.class 
                FROM public.users u
                WHERE u.role = 'student' 
                    AND u.class IS NOT NULL
                    AND NOT EXISTS (
                        SELECT 1 FROM public.class_config cc
                        WHERE cc.class_name = u.class
                    )
    LOOP
        SELECT COUNT(*) INTO v_new_count
        FROM public.users
        WHERE public.users.class = v_class_rec.class
          AND public.users.role = 'student'
          AND public.users.status = 'Active';
        
        -- Create new class_config entry
        INSERT INTO public.class_config (class_name, max_students, current_students)
        VALUES (v_class_rec.class, 50, v_new_count)
        ON CONFLICT (class_name) DO NOTHING;
        
        RETURN QUERY SELECT 
            v_class_rec.class,
            0::INTEGER,
            v_new_count,
            v_new_count;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Test the function
SELECT * FROM recalculate_class_counts();
