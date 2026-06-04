-- ==========================================
-- Single Assigned Mentor Model
-- Date: 2026-06-01
-- ==========================================
-- 1. student_mentor_assignments: tracks the current + historical mentor
--    assigned to each student by an admin.
-- 2. conversations: allow student<->admin "support" threads (mentor_id null)
--    and add a `type` discriminator.
-- ==========================================

-- ------------------------------------------
-- 1. Student <-> Mentor assignments
-- ------------------------------------------
CREATE TABLE IF NOT EXISTS public.student_mentor_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    mentor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    is_current BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMPTZ
);

-- Only one current mentor per student.
CREATE UNIQUE INDEX IF NOT EXISTS idx_student_mentor_assignments_current
    ON public.student_mentor_assignments (student_id)
    WHERE is_current;

CREATE INDEX IF NOT EXISTS idx_student_mentor_assignments_student
    ON public.student_mentor_assignments (student_id);
CREATE INDEX IF NOT EXISTS idx_student_mentor_assignments_mentor
    ON public.student_mentor_assignments (mentor_id);

ALTER TABLE public.student_mentor_assignments ENABLE ROW LEVEL SECURITY;

-- Students can read their own assignments.
DROP POLICY IF EXISTS "Students view own mentor assignments" ON public.student_mentor_assignments;
CREATE POLICY "Students view own mentor assignments" ON public.student_mentor_assignments
    FOR SELECT USING (auth.uid() = student_id);

-- Mentors can read assignments where they are the mentor.
DROP POLICY IF EXISTS "Mentors view their student assignments" ON public.student_mentor_assignments;
CREATE POLICY "Mentors view their student assignments" ON public.student_mentor_assignments
    FOR SELECT USING (auth.uid() = mentor_id);

-- Admins have full access (writes also go through the service-role client).
DROP POLICY IF EXISTS "Admins manage mentor assignments" ON public.student_mentor_assignments;
CREATE POLICY "Admins manage mentor assignments" ON public.student_mentor_assignments
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'admin-dev'))
    ) WITH CHECK (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'admin-dev'))
    );

-- ------------------------------------------
-- 2. Conversations: support threads
-- ------------------------------------------

-- Allow conversations without a mentor (student <-> admin support chats).
ALTER TABLE public.conversations ALTER COLUMN mentor_id DROP NOT NULL;

-- Discriminator: 'mentor' (student<->mentor) or 'support' (student<->admin help desk).
ALTER TABLE public.conversations
    ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'mentor'
    CHECK (type IN ('mentor', 'support'));

-- Legacy constraint allowed multiple rows per student+mentor when session_id was NULL.
ALTER TABLE public.conversations
    DROP CONSTRAINT IF EXISTS conversations_student_mentor_session_unique;
ALTER TABLE public.conversations
    DROP CONSTRAINT IF EXISTS conversations_student_id_mentor_id_key;

-- ---------------------------------------------------------------------------
-- Deduplicate existing mentor conversations before partial unique indexes.
-- Keeps the row with the latest activity; reassigns messages, then deletes dupes.
-- (CTEs are statement-scoped in PostgreSQL — use temp tables for multi-step work.)
-- ---------------------------------------------------------------------------
CREATE TEMP TABLE _mentor_conv_dupes ON COMMIT DROP AS
WITH ranked AS (
    SELECT
        id,
        student_id,
        mentor_id,
        ROW_NUMBER() OVER (
            PARTITION BY student_id, mentor_id
            ORDER BY last_message_at DESC NULLS LAST, created_at DESC NULLS LAST, id DESC
        ) AS rn
    FROM public.conversations
    WHERE mentor_id IS NOT NULL
      AND type = 'mentor'
)
SELECT r.id AS dupe_id, k.id AS keep_id
FROM ranked r
INNER JOIN ranked k
    ON k.student_id = r.student_id
    AND k.mentor_id = r.mentor_id
    AND k.rn = 1
WHERE r.rn > 1;

UPDATE public.messages m
SET conversation_id = d.keep_id
FROM _mentor_conv_dupes d
WHERE m.conversation_id = d.dupe_id;

DELETE FROM public.conversations c
USING _mentor_conv_dupes d
WHERE c.id = d.dupe_id;

-- Deduplicate support threads (if any were created manually).
CREATE TEMP TABLE _support_conv_dupes ON COMMIT DROP AS
WITH ranked_support AS (
    SELECT
        id,
        student_id,
        ROW_NUMBER() OVER (
            PARTITION BY student_id
            ORDER BY last_message_at DESC NULLS LAST, created_at DESC NULLS LAST, id DESC
        ) AS rn
    FROM public.conversations
    WHERE type = 'support'
)
SELECT r.id AS dupe_id, k.id AS keep_id
FROM ranked_support r
INNER JOIN ranked_support k
    ON k.student_id = r.student_id
    AND k.rn = 1
WHERE r.rn > 1;

UPDATE public.messages m
SET conversation_id = sd.keep_id
FROM _support_conv_dupes sd
WHERE m.conversation_id = sd.dupe_id;

DELETE FROM public.conversations c
USING _support_conv_dupes sd
WHERE c.id = sd.dupe_id;

-- At most one support conversation per student.
CREATE UNIQUE INDEX IF NOT EXISTS idx_conversations_support_per_student
    ON public.conversations (student_id)
    WHERE type = 'support';

-- At most one mentor conversation per student-mentor pair (when mentor is set).
CREATE UNIQUE INDEX IF NOT EXISTS idx_conversations_mentor_pair
    ON public.conversations (student_id, mentor_id)
    WHERE type = 'mentor' AND mentor_id IS NOT NULL;
