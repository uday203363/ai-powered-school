-- ============================================
-- CREATE FEE STATUS UPDATES TRACKING TABLE
-- ============================================
-- This table tracks all fee status changes made by class teachers
-- Allows admins to see who updated what and when

CREATE TABLE IF NOT EXISTS public.fee_status_updates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fee_id UUID NOT NULL REFERENCES public.fees(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    old_status VARCHAR(20),
    new_status VARCHAR(20) NOT NULL CHECK (new_status IN ('pending', 'partial', 'paid')),
    updated_by UUID NOT NULL REFERENCES public.users(id) ON DELETE SET NULL,
    updated_by_role VARCHAR(20) DEFAULT 'teacher' CHECK (updated_by_role IN ('teacher', 'admin')),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    FOREIGN KEY (student_id) REFERENCES public.users(id) ON DELETE CASCADE
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_fee_status_updates_fee_id ON public.fee_status_updates(fee_id);
CREATE INDEX IF NOT EXISTS idx_fee_status_updates_student_id ON public.fee_status_updates(student_id);
CREATE INDEX IF NOT EXISTS idx_fee_status_updates_updated_by ON public.fee_status_updates(updated_by);
CREATE INDEX IF NOT EXISTS idx_fee_status_updates_date ON public.fee_status_updates(updated_at);
CREATE INDEX IF NOT EXISTS idx_fee_status_updates_by_role ON public.fee_status_updates(updated_by_role);

-- Add comment explaining the table
COMMENT ON TABLE public.fee_status_updates IS 'Audit trail for fee status changes made by teachers and admins';
COMMENT ON COLUMN public.fee_status_updates.updated_by_role IS 'Role of the person who made the update (teacher or admin)';

-- Verify table creation
SELECT 'fee_status_updates table created successfully!' as status;
