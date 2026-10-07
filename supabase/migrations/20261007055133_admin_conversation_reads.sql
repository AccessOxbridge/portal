-- ==========================================
-- Per-admin read state for conversations
-- Date: 2026-10-07
-- ==========================================
-- ADDITIVE ONLY. No existing table, column, row or policy is touched.
--
-- Students and mentors already have read state: messages.is_read for 1:1
-- threads, conversation_participants.last_read_at for groups. Admins have
-- none, and cannot share is_read — it is one flag per message, so an admin
-- opening a student↔mentor thread would clear the student's own unread
-- badge. Each admin instead gets one "read up to" timestamp per
-- conversation, here, and is_read is never written on their behalf.
--
-- Missing row = the admin has never opened that thread since launch. Those
-- count only messages after the launch cutoff (private.admin_unread_since),
-- otherwise every admin would open the portal to the entire message history
-- marked unread across every conversation.
--
-- Rollback is the last section of this file. Do not apply this to production
-- without an explicit per-instance approval.
-- ==========================================

-- ------------------------------------------------------------------
-- 1. Table
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.conversation_reads (
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    last_read_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (conversation_id, user_id)
);

COMMENT ON TABLE public.conversation_reads IS
    'Per-admin "read up to" pointer for each conversation. Admin-only; students and mentors keep using messages.is_read / conversation_participants.last_read_at.';

CREATE INDEX IF NOT EXISTS idx_conversation_reads_user
    ON public.conversation_reads (user_id);

-- ------------------------------------------------------------------
-- 2. Policies — an admin reads and moves only their own pointer
-- ------------------------------------------------------------------
ALTER TABLE public.conversation_reads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view their own read state" ON public.conversation_reads;
CREATE POLICY "Admins can view their own read state"
    ON public.conversation_reads FOR SELECT
    USING (user_id = auth.uid() AND public.is_portal_admin());

DROP POLICY IF EXISTS "Admins can insert their own read state" ON public.conversation_reads;
CREATE POLICY "Admins can insert their own read state"
    ON public.conversation_reads FOR INSERT
    WITH CHECK (user_id = auth.uid() AND public.is_portal_admin());

DROP POLICY IF EXISTS "Admins can update their own read state" ON public.conversation_reads;
CREATE POLICY "Admins can update their own read state"
    ON public.conversation_reads FOR UPDATE
    USING (user_id = auth.uid() AND public.is_portal_admin())
    WITH CHECK (user_id = auth.uid() AND public.is_portal_admin());

-- Deliberately no DELETE policy.

-- ------------------------------------------------------------------
-- 3. Launch cutoff
--    Frozen to the moment this migration runs, so it is right whenever it
--    is applied. Built with dynamic SQL because a function body cannot
--    otherwise capture now() at creation time.
-- ------------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS private;

DO $do$
BEGIN
    EXECUTE format(
        'CREATE OR REPLACE FUNCTION private.admin_unread_since()
         RETURNS TIMESTAMPTZ
         LANGUAGE sql
         IMMUTABLE
         AS $f$ SELECT %L::timestamptz $f$',
        NOW()
    );
END
$do$;

REVOKE ALL ON FUNCTION private.admin_unread_since() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.admin_unread_since() TO authenticated, service_role;

-- ------------------------------------------------------------------
-- 4. Read-only RPC: unread count + effective read pointer per conversation
--    SECURITY INVOKER, so messages / conversations RLS still applies. Returns
--    nothing for non-admins. Writes nothing.
-- ------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_unread_counts()
RETURNS TABLE (conversation_id UUID, unread_count INTEGER, last_read_at TIMESTAMPTZ)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
    SELECT
        c.id,
        (
            SELECT COUNT(*)::int
            FROM public.messages m
            WHERE m.conversation_id = c.id
              AND m.sender_id <> auth.uid()
              AND m.created_at > COALESCE(r.last_read_at, private.admin_unread_since())
        ),
        COALESCE(r.last_read_at, private.admin_unread_since())
    FROM public.conversations c
    LEFT JOIN public.conversation_reads r
        ON r.conversation_id = c.id AND r.user_id = auth.uid()
    WHERE public.is_portal_admin();
$$;

REVOKE ALL ON FUNCTION public.admin_unread_counts() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_unread_counts() TO authenticated, service_role;

COMMENT ON FUNCTION public.admin_unread_counts() IS
    'Per-conversation unread count and effective read pointer for the calling admin. Read-only; empty for non-admins.';

-- ------------------------------------------------------------------
-- 5. ROLLBACK
--    Safe to run at any time. Drops only admin read pointers; no message,
--    conversation or student/mentor read state is affected.
--
--    DROP FUNCTION IF EXISTS public.admin_unread_counts();
--    DROP FUNCTION IF EXISTS private.admin_unread_since();
--    DROP TABLE IF EXISTS public.conversation_reads;
-- ------------------------------------------------------------------
