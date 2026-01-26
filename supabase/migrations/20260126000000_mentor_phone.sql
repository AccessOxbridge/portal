-- ==========================================
-- Add Phone Column to Mentors Table
-- Date: 2026-01-26
-- ==========================================

ALTER TABLE public.mentors ADD COLUMN IF NOT EXISTS phone TEXT;
