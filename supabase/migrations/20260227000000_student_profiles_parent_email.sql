-- ==========================================
-- Add parent/guardian email for fortnightly reports
-- Date: 2026-02-27
-- ==========================================

ALTER TABLE public.student_profiles
ADD COLUMN IF NOT EXISTS parent_email TEXT;

COMMENT ON COLUMN public.student_profiles.parent_email IS 'Optional email for parent/guardian to receive fortnightly progress reports.';
