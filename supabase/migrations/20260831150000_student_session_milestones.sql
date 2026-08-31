-- ==========================================
-- Student session milestones (congratulatory confetti popup)
-- Date: 2026-08-31
-- ==========================================
-- ADDITIVE ONLY. This migration creates one new table and its policies. It
-- never reads, rewrites or deletes a row in any existing table.
--
-- Purpose: when a student completes their 1st, 5th, 10th, 20th, 50th or 100th
-- session, the dashboard shows a short congratulations with confetti. This
-- table records the ones they have already been shown, so a celebration
-- happens exactly once per milestone per student.
--
-- Why a table rather than localStorage: the milestone should follow the
-- student across devices, and "did this student ever see their 10-session
-- moment" is a fact the team may want to look at later. localStorage would
-- also re-fire the whole thing in a private window.
--
-- Why not a column on `profiles`: `profiles` is deliberately locked down for
-- student writes (see 20260820123000 and 20260827160000, which added triggers
-- protecting `role` and `credits`). A dedicated table lets a student write
-- exactly one fact about themselves and nothing else.
--
-- Note on which milestones a student is eligible for: that is decided in the
-- application, not here. `config/milestones.config.ts` holds a go-live cutoff,
-- and a milestone is only ever celebrated when the session that crossed it
-- happened on or after that date. Students who were already past 10 or 20
-- sessions when this shipped are therefore never ambushed, and no backfill
-- rows are needed in this table.
--
-- Rollback is section 4 at the bottom of this file.
-- ==========================================

-- ------------------------------------------------------------------
-- 1. Table
--    (student_id, milestone) is the primary key: at most one row per
--    milestone per student, and ON CONFLICT DO NOTHING makes the client
--    write idempotent if two tabs celebrate at once.
--
--    `sessions_completed` is the student's completed-session count at the
--    moment we showed it. It is normally equal to `milestone`, but can be
--    higher if several sessions were marked completed in one go, which is
--    worth being able to see when reading these rows back.
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.student_session_milestones (
    student_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    milestone          INTEGER NOT NULL CHECK (milestone > 0),
    sessions_completed INTEGER,
    acknowledged_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (student_id, milestone)
);

COMMENT ON TABLE public.student_session_milestones IS
    'One row per session-count milestone (1st, 5th, 10th, 20th, 50th, 100th) already celebrated for a student. Presence of a row suppresses the popup; it is not a record of the sessions themselves.';

-- ------------------------------------------------------------------
-- 2. RLS
--    A student may record and read their own milestones. Admins may read all.
--    Deliberately no UPDATE or DELETE policy: seeing a milestone is a fact,
--    not state, and nothing should be able to un-celebrate it.
-- ------------------------------------------------------------------
ALTER TABLE public.student_session_milestones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students can record their own milestones" ON public.student_session_milestones;
CREATE POLICY "Students can record their own milestones"
    ON public.student_session_milestones FOR INSERT
    WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS "Students can read their own milestones" ON public.student_session_milestones;
CREATE POLICY "Students can read their own milestones"
    ON public.student_session_milestones FOR SELECT
    USING (student_id = auth.uid());

DROP POLICY IF EXISTS "Admins can read all milestones" ON public.student_session_milestones;
CREATE POLICY "Admins can read all milestones"
    ON public.student_session_milestones FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role IN ('admin', 'admin-dev')
        )
    );

-- ------------------------------------------------------------------
-- 3. No index beyond the primary key
--    Every read is "the rows for one student", which the (student_id,
--    milestone) primary key already serves as a prefix scan.
-- ------------------------------------------------------------------

-- ------------------------------------------------------------------
-- 4. ROLLBACK
--    Safe to run at any time. The table holds only "this student has seen
--    this celebration" markers; dropping it would re-show a milestone popup
--    once and loses no session, feedback or payment data.
--
--    DROP POLICY IF EXISTS "Admins can read all milestones" ON public.student_session_milestones;
--    DROP POLICY IF EXISTS "Students can read their own milestones" ON public.student_session_milestones;
--    DROP POLICY IF EXISTS "Students can record their own milestones" ON public.student_session_milestones;
--    DROP TABLE IF EXISTS public.student_session_milestones;
-- ------------------------------------------------------------------
