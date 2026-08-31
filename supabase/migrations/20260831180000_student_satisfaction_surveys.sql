-- ==========================================
-- Student satisfaction surveys (every-4-sessions check-in)
-- Date: 2026-08-31
-- ==========================================
-- ADDITIVE ONLY. This migration creates one new table and its policies. It
-- never reads, rewrites or deletes a row in any existing table.
--
-- Purpose: every 4 completed sessions, a student is asked three 1-5 questions
-- (portal experience, mentoring sessions, sense of progress) plus an optional
-- comment. A banner pins to the top of their dashboard until they answer; the
-- banner opens the survey modal. This table holds the answers and, by its
-- presence, is what retires the banner.
--
-- Why a table rather than `form_responses`: every row in `form_responses`
-- hangs off a `session_id` and describes one session. This survey deliberately
-- describes the student's experience as a whole and has no session to attach
-- to, so it would have to store a null session_id and hide three separate
-- scores inside the `responses` JSON, where nothing can index or aggregate
-- them. A narrow table with one column per question keeps the admin averages a
-- plain AVG() rather than a JSON cast.
--
-- Why not a column on `profiles`: `profiles` is deliberately locked down for
-- student writes (see 20260820123000 and 20260827160000, which added triggers
-- protecting `role` and `credits`). A dedicated table lets a student write
-- exactly these answers and nothing else.
--
-- Note on students who already have history: unlike the milestone celebration
-- (20260831150000), this feature has NO go-live cutoff, on purpose. A
-- congratulation for work finished months ago reads as a bug; a satisfaction
-- question does not, and the eight students already past 4 completed sessions
-- are exactly the ones whose opinion is worth having on day one. They are each
-- asked once, at their current tier, and then follow the normal cadence.
--
-- Rollback is section 5 at the bottom of this file.
-- ==========================================

-- ------------------------------------------------------------------
-- 1. Table
--    (student_id, session_count) is the primary key, where `session_count` is
--    the *tier* that triggered the survey — 4, 8, 12, ... — not the student's
--    live count. That makes at most one survey per tier per student, and makes
--    the client insert idempotent under ON CONFLICT DO NOTHING if two tabs
--    submit at once.
--
--    `sessions_completed` is the true completed-session count at submission.
--    It is normally equal to `session_count` but can be higher when several
--    sessions are marked completed in one admin pass, which is worth being
--    able to see when reading these rows back.
--
--    The three ratings are NOT NULL: the modal will not submit without all
--    three. `comment` is optional and always will be.
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.student_satisfaction_surveys (
    student_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    session_count      INTEGER NOT NULL CHECK (session_count > 0),
    sessions_completed INTEGER,
    portal_rating      SMALLINT NOT NULL CHECK (portal_rating BETWEEN 1 AND 5),
    mentoring_rating   SMALLINT NOT NULL CHECK (mentoring_rating BETWEEN 1 AND 5),
    progress_rating    SMALLINT NOT NULL CHECK (progress_rating BETWEEN 1 AND 5),
    comment            TEXT,
    submitted_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (student_id, session_count)
);

COMMENT ON TABLE public.student_satisfaction_surveys IS
    'One row per completed every-4-sessions satisfaction check-in. session_count is the tier that triggered it (4, 8, 12, ...), not the live session count. Presence of a row for the current tier retires the dashboard banner.';

COMMENT ON COLUMN public.student_satisfaction_surveys.session_count IS
    'The 4-session tier this survey answers for. Part of the primary key, so a student is asked at most once per tier.';

-- The admin overview reads every row newest-first to chart averages over time,
-- which the (student_id, session_count) primary key does not serve.
CREATE INDEX IF NOT EXISTS idx_student_satisfaction_surveys_submitted_at
    ON public.student_satisfaction_surveys (submitted_at DESC);

-- ------------------------------------------------------------------
-- 2. RLS
--    A student may submit and read their own surveys. Admins may read all.
--    Deliberately no UPDATE or DELETE policy: a submitted answer is a fact,
--    and letting a student rewrite last month's score would quietly corrupt
--    the trend the admin page exists to show.
-- ------------------------------------------------------------------
ALTER TABLE public.student_satisfaction_surveys ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students can submit their own satisfaction surveys" ON public.student_satisfaction_surveys;
CREATE POLICY "Students can submit their own satisfaction surveys"
    ON public.student_satisfaction_surveys FOR INSERT
    WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS "Students can read their own satisfaction surveys" ON public.student_satisfaction_surveys;
CREATE POLICY "Students can read their own satisfaction surveys"
    ON public.student_satisfaction_surveys FOR SELECT
    USING (student_id = auth.uid());

DROP POLICY IF EXISTS "Admins can read all satisfaction surveys" ON public.student_satisfaction_surveys;
CREATE POLICY "Admins can read all satisfaction surveys"
    ON public.student_satisfaction_surveys FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role IN ('admin', 'admin-dev')
        )
    );

-- ------------------------------------------------------------------
-- 3. No backfill
--    Nothing to backfill: an empty table means every eligible student is due
--    their first check-in, which is the intended go-live behaviour.
-- ------------------------------------------------------------------

-- ------------------------------------------------------------------
-- 4. Cadence lives in the application
--    `config/satisfaction.config.ts` owns the interval (every 4 sessions) and
--    the question copy. Deliberately not encoded here: changing the interval
--    should be a config edit, not a migration, and the tier is already
--    recorded on every row so history stays readable if it ever changes.
-- ------------------------------------------------------------------

-- ------------------------------------------------------------------
-- 5. ROLLBACK
--    Destructive: unlike the milestone and feedback-prompt tables, this one
--    holds real student answers, not "already seen" markers. Dropping it loses
--    every satisfaction response permanently. Export first if the data has any
--    value:
--
--    COPY (SELECT * FROM public.student_satisfaction_surveys) TO STDOUT WITH CSV HEADER;
--
--    DROP POLICY IF EXISTS "Admins can read all satisfaction surveys" ON public.student_satisfaction_surveys;
--    DROP POLICY IF EXISTS "Students can read their own satisfaction surveys" ON public.student_satisfaction_surveys;
--    DROP POLICY IF EXISTS "Students can submit their own satisfaction surveys" ON public.student_satisfaction_surveys;
--    DROP INDEX IF EXISTS public.idx_student_satisfaction_surveys_submitted_at;
--    DROP TABLE IF EXISTS public.student_satisfaction_surveys;
-- ------------------------------------------------------------------
