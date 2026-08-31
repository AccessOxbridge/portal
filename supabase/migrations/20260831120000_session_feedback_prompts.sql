-- ==========================================
-- Session feedback prompts (post-session rating popup)
-- Date: 2026-08-31
-- ==========================================
-- ADDITIVE ONLY. This migration creates one new table and its policies. It
-- never reads, rewrites or deletes a row in any existing table.
--
-- Purpose: the student dashboard pops up a "rate your mentor" modal for a
-- recently completed session. When a student chooses "Not now", we record that
-- here so the same session is never popped up again. The session stays
-- rateable from the sessions list — this table suppresses the *prompt*, not
-- the feedback.
--
-- Why a separate table rather than a column on `sessions`: dismissing is a
-- student-initiated write, and `sessions` deliberately has no student UPDATE
-- policy (see 20260820123000 / 20260827160000 for the pattern of keeping
-- student-writable surface as narrow as possible). A dedicated table lets a
-- student write only this one fact about their own session.
--
-- Rollback is section 4 at the bottom of this file.
-- ==========================================

-- ------------------------------------------------------------------
-- 1. Table
--    session_id is the primary key: at most one dismissal per session, and
--    ON CONFLICT DO NOTHING makes the client write idempotent.
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.session_feedback_prompts (
    session_id   UUID PRIMARY KEY REFERENCES public.sessions(id) ON DELETE CASCADE,
    student_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    dismissed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.session_feedback_prompts IS
    'One row per session whose feedback popup the student dismissed. Suppresses the prompt only; the session remains rateable from the sessions list.';

-- Dashboard layout looks up "has this student dismissed anything recently",
-- so the lookup is by student.
CREATE INDEX IF NOT EXISTS idx_session_feedback_prompts_student
    ON public.session_feedback_prompts (student_id);

-- ------------------------------------------------------------------
-- 2. RLS
--    A student may record and read their own dismissals. Admins may read all
--    (so the admin analytics can tell "declined" apart from "never asked").
--    Deliberately no UPDATE or DELETE policy: a dismissal is a fact, not state.
-- ------------------------------------------------------------------
ALTER TABLE public.session_feedback_prompts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students can dismiss their own feedback prompts" ON public.session_feedback_prompts;
CREATE POLICY "Students can dismiss their own feedback prompts"
    ON public.session_feedback_prompts FOR INSERT
    WITH CHECK (
        student_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.sessions s
            WHERE s.id = session_id AND s.student_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Students can read their own feedback prompts" ON public.session_feedback_prompts;
CREATE POLICY "Students can read their own feedback prompts"
    ON public.session_feedback_prompts FOR SELECT
    USING (student_id = auth.uid());

DROP POLICY IF EXISTS "Admins can read all feedback prompts" ON public.session_feedback_prompts;
CREATE POLICY "Admins can read all feedback prompts"
    ON public.session_feedback_prompts FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role IN ('admin', 'admin-dev')
        )
    );

-- ------------------------------------------------------------------
-- 3. Backfill of form_responses.rating — NOT INCLUDED HERE, ON PURPOSE
--    The star rating has always been written into responses->>'mentor_rating'
--    but never into the `rating` column added by 20260126010000, which is what
--    the admin mentor aggregates read. The application fix (writing both) ships
--    with this change. Copying the pre-existing row(s) across is a data
--    mutation, so it is run manually with explicit approval rather than
--    silently as part of a migration:
--
--    UPDATE public.form_responses
--    SET rating = (responses->>'mentor_rating')::INT
--    WHERE form_type = 'student_feedback'
--      AND rating IS NULL
--      AND responses ? 'mentor_rating';
-- ------------------------------------------------------------------

-- ------------------------------------------------------------------
-- 4. ROLLBACK
--    Safe to run at any time. The table holds only "this student said not now"
--    markers; dropping it re-enables prompts for those sessions and loses no
--    feedback.
--
--    DROP POLICY IF EXISTS "Admins can read all feedback prompts" ON public.session_feedback_prompts;
--    DROP POLICY IF EXISTS "Students can read their own feedback prompts" ON public.session_feedback_prompts;
--    DROP POLICY IF EXISTS "Students can dismiss their own feedback prompts" ON public.session_feedback_prompts;
--    DROP INDEX IF EXISTS public.idx_session_feedback_prompts_student;
--    DROP TABLE IF EXISTS public.session_feedback_prompts;
-- ------------------------------------------------------------------
