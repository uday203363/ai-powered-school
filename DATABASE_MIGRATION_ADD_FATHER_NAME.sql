-- ======================================
-- Add Father's Name Column to Users Table
-- ======================================

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS father_name VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_users_father_name ON public.users(father_name);

-- ======================================
-- Add Phone Column if it doesn't exist
-- ======================================
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS phone VARCHAR(20);

CREATE INDEX IF NOT EXISTS idx_users_phone ON public.users(phone);

-- ======================================
-- Done
-- ======================================
-- This migration adds the father_name and phone columns that are being used in the Student Registration form.
