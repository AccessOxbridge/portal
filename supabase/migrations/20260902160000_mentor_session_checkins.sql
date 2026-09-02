-- ==========================================
-- Mentor post-session check-in
-- Date: 2026-09-02
-- ==========================================
-- ADDITIVE ONLY. This migration creates one new table and its policies. It
-- never reads, rewrites or deletes a row in any existing table.
--
-- Purpose: after a session completes, the mentor dashboard pops up a two
-- question check-in on their next load — "did you set homework?" and "have you
-- booked the next session?" — plus a shortcut to the existing Request a Session
-- modal. One row is written per session, whichever way the mentor leaves:
-- answered, or dismissed.
--
-- Why a separate table rather than columns on `sessions`: `sessions` has no
-- mentor UPDATE policy for these fields and we would rather not add one (see
-- 20260820123000 / 20260827160000 for the pattern of keeping the writable
-- surface as narrow as possible). Why not `form_responses`: this is a ten
-- second nudge, not the multi-step session report, and folding it in would
-- make every check-in look like a half-finished report in the admin views.
--
-- Mirrors session_feedback_prompts (20260831120000), which does the same job
-- on the student side.
--
-- Rollback is section 4 at the bottom of this file.
-- ==========================================

-- ------------------------------------------------------------------
-- 1. Table
--    session_id is the primary key: at most one check-in per session, and
--    ON CONFLICT DO NOTHING makes the client write idempotent.
--
--    Both answers are nullable, and null is meaningful:
--      homework_given       NULL -> mentor closed without answering
--      next_session_booked  NULL -> not asked, because the system could already
--                                   see a future session or a pending request
--    `dismissed` separates "closed the popup" from "answered No to both".
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.mentor_session_checkins (
    session_id          UUID PRIMARY KEY REFERENCES public.sessions(id) ON DELETE CASCADE,
    mentor_id           UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    homework_given      BOOLEAN,
    next_session_booked BOOLEAN,
    dismissed           BOOLEAN NOT NULL DEFAULT FALSE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.mentor_session_checkins IS
    'One row per session whose post-session check-in the mentor answered or dismissed. Suppresses the prompt for that session either way.';
COMMENT ON COLUMN public.mentor_session_checkins.homework_given IS
    'Mentor said they set homework. NULL = closed the popup without answering.';
COMMENT ON COLUMN public.mentor_session_checkins.next_session_booked IS
    'Mentor said the next session is booked. NULL = never asked, because a future session or pending request already existed.';

-- The prompt selector asks "has this mentor handled these sessions", so the
-- lookup is by mentor. The primary key covers the per-session lookup.
CREATE INDEX IF NOT EXISTS idx_mentor_session_checkins_mentor
    ON public.mentor_session_checkins (mentor_id);

-- ------------------------------------------------------------------
-- 2. RLS
--    A mentor may record and read their own check-ins, and only for a session
--    that is actually theirs. Admins may read all, so the admin views can tell
--    "said no" apart from "never asked".
--    Deliberately no UPDATE or DELETE policy: a check-in is a fact, not state.
-- ------------------------------------------------------------------
ALTER TABLE public.mentor_session_checkins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Mentors can record their own session check-ins" ON public.mentor_session_checkins;
CREATE POLICY "Mentors can record their own session check-ins"
    ON public.mentor_session_checkins FOR INSERT
    WITH CHECK (
        mentor_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.sessions s
            WHERE s.id = session_id AND s.mentor_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Mentors can read their own session check-ins" ON public.mentor_session_checkins;
CREATE POLICY "Mentors can read their own session check-ins"
    ON public.mentor_session_checkins FOR SELECT
    USING (mentor_id = auth.uid());

DROP POLICY IF EXISTS "Admins can read all session check-ins" ON public.mentor_session_checkins;
CREATE POLICY "Admins can read all session check-ins"
    ON public.mentor_session_checkins FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role IN ('admin', 'admin-dev')
        )
    );

-- ------------------------------------------------------------------
-- 3. No backfill.
--    Sessions that completed before this shipped are never prompted about —
--    see config/mentor-checkin.config.ts, which holds the go-live cutoff for
--    the same reason the student feedback prompt has one.
-- ------------------------------------------------------------------

-- ------------------------------------------------------------------
-- 4. ROLLBACK
--    Safe to run at any time. The table holds only the mentor's answers to a
--    two question nudge; dropping it re-enables the prompt for those sessions
--    and loses no session, report or feedback data.
--
--    DROP POLICY IF EXISTS "Admins can read all session check-ins" ON public.mentor_session_checkins;
--    DROP POLICY IF EXISTS "Mentors can read their own session check-ins" ON public.mentor_session_checkins;
--    DROP POLICY IF EXISTS "Mentors can record their own session check-ins" ON public.mentor_session_checkins;
--    DROP INDEX IF EXISTS public.idx_mentor_session_checkins_mentor;
--    DROP TABLE IF EXISTS public.mentor_session_checkins;
-- ------------------------------------------------------------------
