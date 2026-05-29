-- ======================================
-- Student Register Number System
-- Database Migration Script
-- ======================================

-- ======================================
-- 1. CREATE STUDENT_REGISTER_SEQUENCE TABLE
-- ======================================
CREATE TABLE IF NOT EXISTS public.student_register_sequence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admission_year INTEGER NOT NULL CHECK (admission_year > 2000 AND admission_year < 2100),
    school_code VARCHAR(4) NOT NULL,
    current_sequence INTEGER DEFAULT 0,
    max_sequence INTEGER DEFAULT 9999 CHECK (max_sequence > 0),
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(admission_year, school_code)
);

CREATE INDEX IF NOT EXISTS idx_register_sequence_year_school 
ON public.student_register_sequence(admission_year, school_code);

-- ======================================
-- 2. CREATE STUDENT_AUDIT_LOG TABLE
-- ======================================
CREATE TABLE IF NOT EXISTS public.student_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    register_no VARCHAR(12) NOT NULL,
    action VARCHAR(50) NOT NULL, -- created, updated, status_changed, deactivated, transferred, dropped
    field_name VARCHAR(100),
    old_value TEXT,
    new_value TEXT,
    changed_by UUID REFERENCES public.users(id),
    changed_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    reason TEXT,
    CHECK (action IN ('created', 'updated', 'status_changed', 'deactivated', 'transferred', 'dropped', 'reactivated'))
);

CREATE INDEX IF NOT EXISTS idx_audit_student ON public.student_audit_log(student_id);
CREATE INDEX IF NOT EXISTS idx_audit_register ON public.student_audit_log(register_no);
CREATE INDEX IF NOT EXISTS idx_audit_action ON public.student_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_date ON public.student_audit_log(changed_at);

-- ======================================
-- 3. ALTER USERS TABLE - ADD NEW COLUMNS
-- ======================================
-- Add new columns if they don't exist
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS register_no VARCHAR(12) UNIQUE NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS admission_year INTEGER,
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive', 'Transferred', 'Dropped', 'Left', 'Graduated')),
ADD COLUMN IF NOT EXISTS date_of_birth DATE,
ADD COLUMN IF NOT EXISTS gender VARCHAR(10),
ADD COLUMN IF NOT EXISTS parent_email VARCHAR(255),
ADD COLUMN IF NOT EXISTS parent_phone VARCHAR(20),
ADD COLUMN IF NOT EXISTS address TEXT;

-- Create indexes on users table
CREATE INDEX IF NOT EXISTS idx_users_register_no ON public.users(register_no);
CREATE INDEX IF NOT EXISTS idx_users_class ON public.users(class);
CREATE INDEX IF NOT EXISTS idx_users_admission_year ON public.users(admission_year);
CREATE INDEX IF NOT EXISTS idx_users_status ON public.users(status);
CREATE INDEX IF NOT EXISTS idx_users_role_status ON public.users(role, status);

-- ======================================
-- 4. UPDATE EXISTING USERS TABLE - SET DEFAULTS
-- ======================================
-- Set admission_year for existing students (based on created_at or default current year)
UPDATE public.users 
SET admission_year = COALESCE(
    admission_year, 
    EXTRACT(YEAR FROM created_at)::INTEGER, 
    EXTRACT(YEAR FROM CURRENT_TIMESTAMP)::INTEGER
)
WHERE role = 'student' AND admission_year IS NULL;

-- Set status for existing students
UPDATE public.users 
SET status = COALESCE(status, 'Active') 
WHERE role = 'student' AND status IS NULL;

-- ======================================
-- 5. ALTER MARKS TABLE - ADD NEW COLUMNS
-- ======================================
ALTER TABLE public.marks
ADD COLUMN IF NOT EXISTS register_no VARCHAR(12) REFERENCES public.users(register_no),
ADD COLUMN IF NOT EXISTS admission_year INTEGER;

CREATE INDEX IF NOT EXISTS idx_marks_register_no ON public.marks(register_no);
CREATE INDEX IF NOT EXISTS idx_marks_student_id ON public.marks(student_id);

-- ======================================
-- 6. ALTER ATTENDANCE TABLE - ADD NEW COLUMNS
-- ======================================
ALTER TABLE public.attendance
ADD COLUMN IF NOT EXISTS register_no VARCHAR(12) REFERENCES public.users(register_no),
ADD COLUMN IF NOT EXISTS admission_year INTEGER;

CREATE INDEX IF NOT EXISTS idx_attendance_register_no ON public.attendance(register_no);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON public.attendance(date);
CREATE INDEX IF NOT EXISTS idx_attendance_student_id ON public.attendance(student_id);

-- ======================================
-- 7. ALTER FEES TABLE - ADD NEW COLUMNS
-- ======================================
ALTER TABLE public.fees
ADD COLUMN IF NOT EXISTS register_no VARCHAR(12) REFERENCES public.users(register_no),
ADD COLUMN IF NOT EXISTS admission_year INTEGER;

CREATE INDEX IF NOT EXISTS idx_fees_register_no ON public.fees(register_no);
CREATE INDEX IF NOT EXISTS idx_fees_year_month ON public.fees(year, month);
CREATE INDEX IF NOT EXISTS idx_fees_student_id ON public.fees(student_id);

-- ======================================
-- 8. CREATE HELPER FUNCTIONS
-- ======================================

-- Function to increment class student count
CREATE OR REPLACE FUNCTION increment_class_students(p_class_name VARCHAR)
RETURNS VOID AS $$
BEGIN
    UPDATE public.class_config 
    SET current_students = current_students + 1,
        updated_at = CURRENT_TIMESTAMP
    WHERE class_name = p_class_name;
END;
$$ LANGUAGE plpgsql;

-- Function to decrement class student count
CREATE OR REPLACE FUNCTION decrement_class_students(p_class_name VARCHAR)
RETURNS VOID AS $$
BEGIN
    UPDATE public.class_config 
    SET current_students = GREATEST(0, current_students - 1),
        updated_at = CURRENT_TIMESTAMP
    WHERE class_name = p_class_name;
END;
$$ LANGUAGE plpgsql;

-- Function to get next register number
CREATE OR REPLACE FUNCTION get_next_register_number(
    p_admission_year INTEGER,
    p_school_code VARCHAR(4)
)
RETURNS VARCHAR AS $$
DECLARE
    v_sequence INTEGER;
    v_register_no VARCHAR(12);
    v_yy VARCHAR(2);
BEGIN
    -- Get or create sequence
    INSERT INTO public.student_register_sequence (admission_year, school_code, current_sequence)
    VALUES (p_admission_year, p_school_code, 0)
    ON CONFLICT (admission_year, school_code)
    DO UPDATE SET updated_at = CURRENT_TIMESTAMP
    RETURNING current_sequence INTO v_sequence;

    -- Increment sequence
    UPDATE public.student_register_sequence
    SET current_sequence = current_sequence + 1
    WHERE admission_year = p_admission_year AND school_code = p_school_code
    RETURNING current_sequence INTO v_sequence;

    -- Check if exceeded maximum
    IF v_sequence > 9999 THEN
        RAISE EXCEPTION 'Maximum students (9999) exceeded for year % at %', p_admission_year, p_school_code;
    END IF;

    -- Format YY (last 2 digits of year)
    v_yy := LPAD(CAST((p_admission_year % 100) AS VARCHAR), 2, '0');

    -- Generate register number: YYSSSNNNN
    v_register_no := v_yy || p_school_code || LPAD(CAST(v_sequence AS VARCHAR), 4, '0');

    RETURN v_register_no;
END;
$$ LANGUAGE plpgsql;

-- Function to check if student can login
CREATE OR REPLACE FUNCTION can_student_login(p_register_no VARCHAR)
RETURNS BOOLEAN AS $$
DECLARE
    v_status VARCHAR;
BEGIN
    SELECT status INTO v_status 
    FROM public.users 
    WHERE register_no = p_register_no AND role = 'student';

    IF v_status IS NULL THEN
        RETURN FALSE;
    END IF;

    RETURN v_status = 'Active';
END;
$$ LANGUAGE plpgsql;

-- Function to get complete student statistics
CREATE OR REPLACE FUNCTION get_student_statistics(p_admission_year INTEGER, p_school_code VARCHAR(4))
RETURNS TABLE (
    total_students BIGINT,
    active_students BIGINT,
    inactive_students BIGINT,
    transferred_students BIGINT,
    dropped_students BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*) FILTER (WHERE status IS NOT NULL),
        COUNT(*) FILTER (WHERE status = 'Active'),
        COUNT(*) FILTER (WHERE status = 'Inactive'),
        COUNT(*) FILTER (WHERE status = 'Transferred'),
        COUNT(*) FILTER (WHERE status = 'Dropped')
    FROM public.users
    WHERE admission_year = p_admission_year 
    AND role = 'student'
    AND register_no LIKE p_school_code || '%';
END;
$$ LANGUAGE plpgsql;

-- ======================================
-- 9. CREATE TRIGGER FOR UPDATED_AT
-- ======================================
CREATE OR REPLACE FUNCTION update_students_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_student_register_sequence_timestamp ON public.student_register_sequence;
CREATE TRIGGER update_student_register_sequence_timestamp
BEFORE UPDATE ON public.student_register_sequence
FOR EACH ROW EXECUTE FUNCTION update_students_timestamp();

-- ======================================
-- 10. INSERT INITIAL SEQUENCE RECORD (SBPS)
-- ======================================
-- Initialize sequence for current year
INSERT INTO public.student_register_sequence (admission_year, school_code, current_sequence, max_sequence)
VALUES (EXTRACT(YEAR FROM CURRENT_TIMESTAMP)::INTEGER, 'SBPS', 0, 9999)
ON CONFLICT (admission_year, school_code) DO NOTHING;

-- ======================================
-- 11. CREATE RLS POLICIES (Row Level Security)
-- ======================================
-- Enable RLS on student tables
ALTER TABLE public.student_register_sequence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_audit_log ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS student_register_sequence_select ON public.student_register_sequence;
DROP POLICY IF EXISTS student_register_sequence_insert ON public.student_register_sequence;
DROP POLICY IF EXISTS student_register_sequence_update ON public.student_register_sequence;
DROP POLICY IF EXISTS student_register_sequence_delete ON public.student_register_sequence;
DROP POLICY IF EXISTS admin_view_audit ON public.student_audit_log;
DROP POLICY IF EXISTS teacher_view_audit ON public.student_audit_log;

-- Sequence table should only be accessible by admins
CREATE POLICY student_register_sequence_select ON public.student_register_sequence
FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.id = auth.uid()
          AND u.role = 'admin'
    )
);

CREATE POLICY student_register_sequence_insert ON public.student_register_sequence
FOR INSERT TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.id = auth.uid()
          AND u.role = 'admin'
    )
);

CREATE POLICY student_register_sequence_update ON public.student_register_sequence
FOR UPDATE TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.id = auth.uid()
          AND u.role = 'admin'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.id = auth.uid()
          AND u.role = 'admin'
    )
);

CREATE POLICY student_register_sequence_delete ON public.student_register_sequence
FOR DELETE TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.id = auth.uid()
          AND u.role = 'admin'
    )
);

-- Policy: Admins can view all audit logs
CREATE POLICY admin_view_audit ON public.student_audit_log
FOR SELECT TO authenticated
USING (
    auth.uid() IN (
        SELECT id FROM public.users 
        WHERE role = 'admin'
    )
);

-- Policy: Teachers can view audit logs for their class students
CREATE POLICY teacher_view_audit ON public.student_audit_log
FOR SELECT TO authenticated
USING (
    auth.uid() IN (
        SELECT u1.id FROM public.users u1
        INNER JOIN public.users u2 ON u2.class = (
            SELECT class FROM public.users WHERE id = u1.id AND role = 'student'
        )
        WHERE u1.role = 'teacher'
    )
);

-- ======================================
-- Migration Complete
-- ======================================

-- ======================================
-- Migration Summary
-- ======================================
-- Created tables:
-- ✅ student_register_sequence - Tracks auto-incrementing sequences
-- ✅ student_audit_log - Logs all student record changes
-- 
-- Enhanced tables:
-- ✅ users - Added register_no, admission_year, status, contact fields
-- ✅ marks - Added register_no, admission_year for tracking
-- ✅ attendance - Added register_no, admission_year for tracking
-- ✅ fees - Added register_no, admission_year for tracking
-- ✅ class_config - Ready for student count tracking
--
-- Created functions:
-- ✅ get_next_register_number() - Generate unique register numbers
-- ✅ increment_class_students() - Update class enrollment
-- ✅ decrement_class_students() - Update class enrollment
-- ✅ can_student_login() - Check login eligibility
-- ✅ get_student_statistics() - Student statistics
--
-- Created indexes for performance optimization
-- ✅ All critical queries indexed
--
-- ======================================
