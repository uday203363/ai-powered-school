-- ============================================
-- ADD TRIGGERS FOR AUTOMATIC CLASS COUNT UPDATES
-- ============================================
-- These triggers will automatically update class_config.current_students
-- when students are inserted, updated, or deleted

-- Create a function to update class count on INSERT
CREATE OR REPLACE FUNCTION update_class_count_on_insert()
RETURNS TRIGGER AS $$
BEGIN
    -- Only process if it's a student being inserted
    IF NEW.role = 'student' AND NEW.class IS NOT NULL THEN
        -- Increment the class count for the new student's class
        UPDATE public.class_config cc
        SET current_students = cc.current_students + 1,
            updated_at = CURRENT_TIMESTAMP
        WHERE cc.class_name = NEW.class;
        
        -- If no row exists for this class, create it
        IF NOT FOUND THEN
            INSERT INTO public.class_config (class_name, max_students, current_students)
            VALUES (NEW.class, 50, 1)
            ON CONFLICT (class_name) DO UPDATE
            SET current_students = public.class_config.current_students + 1,
                updated_at = CURRENT_TIMESTAMP;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a function to update class count on UPDATE
CREATE OR REPLACE FUNCTION update_class_count_on_update()
RETURNS TRIGGER AS $$
BEGIN
    -- Handle class change
    IF OLD.class IS DISTINCT FROM NEW.class AND NEW.role = 'student' THEN
        -- Decrement old class if it exists
        IF OLD.class IS NOT NULL THEN
            UPDATE public.class_config cc
            SET current_students = GREATEST(0, cc.current_students - 1),
                updated_at = CURRENT_TIMESTAMP
            WHERE cc.class_name = OLD.class;
        END IF;
        
        -- Increment new class if it exists
        IF NEW.class IS NOT NULL THEN
            UPDATE public.class_config cc
            SET current_students = cc.current_students + 1,
                updated_at = CURRENT_TIMESTAMP
            WHERE cc.class_name = NEW.class;
        END IF;
    END IF;
    
    -- Handle status change (count only Active students)
    IF OLD.status IS DISTINCT FROM NEW.status AND NEW.role = 'student' AND NEW.class IS NOT NULL THEN
        IF OLD.status = 'Active' AND NEW.status != 'Active' THEN
            -- Student became inactive
            UPDATE public.class_config cc
            SET current_students = GREATEST(0, cc.current_students - 1),
                updated_at = CURRENT_TIMESTAMP
            WHERE cc.class_name = NEW.class;
        ELSIF OLD.status != 'Active' AND NEW.status = 'Active' THEN
            -- Student became active
            UPDATE public.class_config cc
            SET current_students = cc.current_students + 1,
                updated_at = CURRENT_TIMESTAMP
            WHERE cc.class_name = NEW.class;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a function to update class count on DELETE
CREATE OR REPLACE FUNCTION update_class_count_on_delete()
RETURNS TRIGGER AS $$
BEGIN
    -- Only process if it was a student
    IF OLD.role = 'student' AND OLD.class IS NOT NULL AND OLD.status = 'Active' THEN
        UPDATE public.class_config cc
        SET current_students = GREATEST(0, cc.current_students - 1),
            updated_at = CURRENT_TIMESTAMP
        WHERE cc.class_name = OLD.class;
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS trigger_update_class_count_insert ON public.users;
DROP TRIGGER IF EXISTS trigger_update_class_count_update ON public.users;
DROP TRIGGER IF EXISTS trigger_update_class_count_delete ON public.users;

-- Create triggers on users table
CREATE TRIGGER trigger_update_class_count_insert
AFTER INSERT ON public.users
FOR EACH ROW
EXECUTE FUNCTION update_class_count_on_insert();

CREATE TRIGGER trigger_update_class_count_update
AFTER UPDATE ON public.users
FOR EACH ROW
EXECUTE FUNCTION update_class_count_on_update();

CREATE TRIGGER trigger_update_class_count_delete
AFTER DELETE ON public.users
FOR EACH ROW
EXECUTE FUNCTION update_class_count_on_delete();

-- Final verification
SELECT 'Triggers created successfully!' as status;
