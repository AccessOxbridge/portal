-- ==========================================
-- Add entrance_exam_date to student_profiles
-- Date: 2026-09-18
-- ==========================================
-- Lets a student record their actual entrance exam date, so the
-- Application Timeline widget can show a real date instead of the
-- generic "Oct 20" placeholder milestone. Nullable, no default —
-- existing rows are unaffected until a student edits their profile.

ALTER TABLE public.student_profiles
ADD COLUMN IF NOT EXISTS entrance_exam_date DATE;

-- ==========================================
-- Rollback
-- ==========================================
-- ALTER TABLE public.student_profiles DROP COLUMN IF EXISTS entrance_exam_date;
