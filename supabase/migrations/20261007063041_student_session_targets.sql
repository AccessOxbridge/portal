-- ==========================================
-- Student session targets (session frequency tracking)
-- Date: 2026-10-07
-- ==========================================
-- ADDITIVE ONLY. This migration creates one new table, one index and one
-- policy. It never reads, rewrites or deletes a row in any existing table.
--
-- Purpose: admins record how often each student is expected to have a
-- session, and the admin Performance dashboard compares completed sessions
-- against that pace to flag students who are falling behind.
--
-- Why admins enter it rather than it being derived: the portal has no record
-- of what a student actually bought. Packages are sold outside the portal and
-- credits arrive as admin adjustments, so neither the size nor the length of
-- a package can be read back from `credit_transactions`.
--
-- Two kinds of plan, sharing the same three numbers:
--   package  `sessions` in total over `weeks`, from `start_date`.
--            "70 over 70 weeks" -> 1 a week, 70 expected by week 70.
--            Judged on the running total since `start_date`.
--   ongoing  `sessions` every `weeks`, with no end. For students who pay as
--            they go (topped up weekly). "2 every 1 week" -> 2 a week.
--            Judged on a rolling recent window, so an old quiet month does
--            not keep them flagged forever.
--
-- `weeks` is NUMERIC so "1 every 2.5 weeks" can be stored as 1 over 2.5.
--
-- Rollback is section 3 at the bottom of this file.
-- ==========================================

-- ------------------------------------------------------------------
-- 1. Table
--    student_id is the primary key: one current target per student. Editing
--    a target replaces it.
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.student_session_targets (
    student_id  UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    plan_type   TEXT NOT NULL CHECK (plan_type IN ('package', 'ongoing')),
    sessions    INTEGER NOT NULL CHECK (sessions BETWEEN 1 AND 1000),
    weeks       NUMERIC(6, 2) NOT NULL CHECK (weeks > 0 AND weeks <= 520),
    start_date  DATE NOT NULL,
    note        TEXT CHECK (note IS NULL OR char_length(note) <= 500),
    set_by      UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.student_session_targets IS
    'Admin-entered expected session frequency per student. package = sessions in total over weeks; ongoing = sessions every weeks, no end.';

CREATE INDEX IF NOT EXISTS idx_student_session_targets_set_by
    ON public.student_session_targets (set_by);

-- ------------------------------------------------------------------
-- 2. RLS
--    Admins may read. Deliberately no INSERT/UPDATE/DELETE policy: writes go
--    through server actions that confirm the caller is an admin and then use
--    the service-role client (same shape as create-account). Students and
--    mentors cannot see or change targets.
-- ------------------------------------------------------------------
ALTER TABLE public.student_session_targets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read session targets" ON public.student_session_targets;
CREATE POLICY "Admins can read session targets"
    ON public.student_session_targets FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role IN ('admin', 'admin-dev')
        )
    );

-- ------------------------------------------------------------------
-- 3. ROLLBACK
--    Safe to run at any time. Discards only the targets themselves; no
--    session, credit or profile data lives here.
--
--    DROP POLICY IF EXISTS "Admins can read session targets" ON public.student_session_targets;
--    DROP INDEX IF EXISTS public.idx_student_session_targets_set_by;
--    DROP TABLE IF EXISTS public.student_session_targets;
-- ------------------------------------------------------------------
