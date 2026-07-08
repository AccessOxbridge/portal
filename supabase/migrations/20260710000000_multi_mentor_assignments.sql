-- Allow a student to have multiple mentors assigned at the same time.
--
-- Previously, `idx_student_mentor_assignments_current` enforced at most one
-- `is_current` row per student (see 20260601000000_single_assigned_mentor.sql).
-- We drop that constraint so admins can assign several concurrent mentors to
-- a student. RLS policies on student_mentor_assignments are already scoped
-- per-row (student_id / mentor_id), so no policy changes are required.

DROP INDEX IF EXISTS public.idx_student_mentor_assignments_current;

-- Keep a (non-unique) index for the common "current mentors for a student"
-- lookup pattern used throughout the app.
CREATE INDEX IF NOT EXISTS idx_student_mentor_assignments_student_current
    ON public.student_mentor_assignments (student_id)
    WHERE is_current;
