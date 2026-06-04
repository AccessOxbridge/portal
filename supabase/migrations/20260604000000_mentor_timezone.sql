-- ==========================================
-- Mentor timezone
-- Date: 2026-06-04
-- ==========================================
-- Students already store their timezone on student_profiles.timezone.
-- Mentors had no equivalent, so the new account Settings page can now
-- read/write a mentor's timezone here (used for scheduling display).
-- ==========================================

ALTER TABLE public.mentors
    ADD COLUMN IF NOT EXISTS timezone TEXT;
