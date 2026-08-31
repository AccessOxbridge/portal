-- ==========================================
-- Admin-created group conversations
-- Date: 2026-08-31
-- ==========================================
-- ADDITIVE ONLY. Existing mentor / support / mentor_support rows are never
-- read, rewritten or deleted. 1:1 membership stays on conversations.student_id
-- / mentor_id / admin_id. Groups are a new `type` plus a participants table.
--
-- A group is N students + M mentors (N>=1, M>=1, N+M>=3) with Claire always
-- included. The same non-admin participant set cannot spawn two groups.
--
-- Rollback is the last section of this file. Do not apply this to production
-- without an explicit per-instance approval.
-- ==========================================

-- ------------------------------------------------------------------
-- 1. Type discriminator
-- ------------------------------------------------------------------
ALTER TABLE public.conversations DROP CONSTRAINT IF EXISTS conversations_type_check;
ALTER TABLE public.conversations
    ADD CONSTRAINT conversations_type_check
    CHECK (type IN ('mentor', 'support', 'mentor_support', 'group'));

-- Groups must not reuse the 1:1 pair columns. Those stay null so existing
-- unique indexes (one support thread per student, one mentor pair, one
-- mentor_support per mentor) never collide with a group row.
ALTER TABLE public.conversations DROP CONSTRAINT IF EXISTS conversations_group_null_pair;
ALTER TABLE public.conversations
    ADD CONSTRAINT conversations_group_null_pair
    CHECK (type <> 'group' OR (student_id IS NULL AND mentor_id IS NULL));

-- Sorted non-admin user ids, used only for type='group' uniqueness.
ALTER TABLE public.conversations
    ADD COLUMN IF NOT EXISTS participant_set_key TEXT;

COMMENT ON COLUMN public.conversations.participant_set_key IS
    'Sorted comma-separated non-admin user ids. Unique for type=group so the same people cannot get two rooms. NULL on 1:1 threads.';

CREATE UNIQUE INDEX IF NOT EXISTS idx_conversations_group_participant_set
    ON public.conversations (participant_set_key)
    WHERE type = 'group';

-- ------------------------------------------------------------------
-- 2. Participants (groups only — 1:1 threads are not backfilled)
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.conversation_participants (
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('student', 'mentor', 'admin')),
    last_read_at TIMESTAMPTZ,
    last_notified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (conversation_id, user_id)
);

COMMENT ON TABLE public.conversation_participants IS
    'Membership for type=group conversations. 1:1 threads keep using conversations.student_id / mentor_id / admin_id and are not mirrored here.';

CREATE INDEX IF NOT EXISTS idx_conversation_participants_user
    ON public.conversation_participants (user_id);

-- ------------------------------------------------------------------
-- 3. RLS helper
--    SECURITY DEFINER so conversation policies can ask "is the caller a
--    member?" without recursing through conversation_participants policies
--    that themselves read conversations. Lives in `private` so PostgREST
--    does not expose it as RPC (public / graphql_public only).
-- ------------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS private;

CREATE OR REPLACE FUNCTION private.is_conversation_participant(conv_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.conversation_participants
        WHERE conversation_id = conv_id
          AND user_id = auth.uid()
    );
$$;

REVOKE ALL ON FUNCTION private.is_conversation_participant(UUID) FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_conversation_participant(UUID) TO authenticated, service_role;

COMMENT ON FUNCTION private.is_conversation_participant(UUID) IS
    'True when auth.uid() has a row in conversation_participants for this conversation. Bypasses RLS to avoid policy recursion; not part of the Data API.';

-- ------------------------------------------------------------------
-- 4. Policies — conversation_participants
-- ------------------------------------------------------------------
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Participants can view group members" ON public.conversation_participants;
CREATE POLICY "Participants can view group members"
    ON public.conversation_participants FOR SELECT
    USING (
        user_id = auth.uid()
        OR private.is_conversation_participant(conversation_id)
        OR EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('admin', 'admin-dev')
        )
    );

DROP POLICY IF EXISTS "Participants can update their own read state" ON public.conversation_participants;
CREATE POLICY "Participants can update their own read state"
    ON public.conversation_participants FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can insert group participants" ON public.conversation_participants;
CREATE POLICY "Admins can insert group participants"
    ON public.conversation_participants FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('admin', 'admin-dev')
        )
    );

DROP POLICY IF EXISTS "Admins can delete group participants" ON public.conversation_participants;
CREATE POLICY "Admins can delete group participants"
    ON public.conversation_participants FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('admin', 'admin-dev')
        )
    );

-- ------------------------------------------------------------------
-- 5. Policies — conversations + messages
--    Existing column checks stay as they are. Group members are added via
--    the helper. Message mark-as-read (is_read) is intentionally NOT
--    extended: groups use last_read_at so one person opening the thread
--    cannot clear everyone else's unread.
-- ------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view their own conversations" ON public.conversations;
CREATE POLICY "Users can view their own conversations" ON public.conversations
    FOR SELECT USING (
        auth.uid() = student_id OR
        auth.uid() = mentor_id OR
        auth.uid() = admin_id OR
        private.is_conversation_participant(id) OR
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'admin-dev'))
    );

DROP POLICY IF EXISTS "Users can update their own conversations" ON public.conversations;
CREATE POLICY "Users can update their own conversations" ON public.conversations
    FOR UPDATE USING (
        auth.uid() = student_id OR
        auth.uid() = mentor_id OR
        auth.uid() = admin_id OR
        private.is_conversation_participant(id) OR
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'admin-dev'))
    );

DROP POLICY IF EXISTS "Users can view messages in their conversations" ON public.messages;
CREATE POLICY "Users can view messages in their conversations" ON public.messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.conversations c
            WHERE c.id = messages.conversation_id
            AND (
                c.student_id = auth.uid() OR
                c.mentor_id = auth.uid() OR
                c.admin_id = auth.uid() OR
                private.is_conversation_participant(c.id) OR
                EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'admin-dev'))
            )
        )
    );

DROP POLICY IF EXISTS "Users can send messages in their conversations" ON public.messages;
CREATE POLICY "Users can send messages in their conversations" ON public.messages
    FOR INSERT WITH CHECK (
        auth.uid() = sender_id AND
        EXISTS (
            SELECT 1 FROM public.conversations c
            WHERE c.id = conversation_id
            AND (
                c.student_id = auth.uid() OR
                c.mentor_id = auth.uid() OR
                c.admin_id = auth.uid() OR
                private.is_conversation_participant(c.id) OR
                EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'admin-dev'))
            )
        )
    );

-- ------------------------------------------------------------------
-- 6. ROLLBACK
--    Restore 1:1-only chat. Drops group rows (CASCADE from conversations
--    type would not fire — delete group conversations first if any exist).
--
--    DELETE FROM public.conversations WHERE type = 'group';
--
--    DROP POLICY IF EXISTS "Users can send messages in their conversations" ON public.messages;
--    CREATE POLICY "Users can send messages in their conversations" ON public.messages
--        FOR INSERT WITH CHECK (
--            auth.uid() = sender_id AND
--            EXISTS (
--                SELECT 1 FROM public.conversations c
--                WHERE c.id = conversation_id
--                AND (
--                    c.student_id = auth.uid() OR
--                    c.mentor_id = auth.uid() OR
--                    c.admin_id = auth.uid() OR
--                    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'admin-dev'))
--                )
--            )
--        );
--
--    DROP POLICY IF EXISTS "Users can view messages in their conversations" ON public.messages;
--    CREATE POLICY "Users can view messages in their conversations" ON public.messages
--        FOR SELECT USING (
--            EXISTS (
--                SELECT 1 FROM public.conversations c
--                WHERE c.id = messages.conversation_id
--                AND (
--                    c.student_id = auth.uid() OR
--                    c.mentor_id = auth.uid() OR
--                    c.admin_id = auth.uid() OR
--                    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'admin-dev'))
--                )
--            )
--        );
--
--    DROP POLICY IF EXISTS "Users can update their own conversations" ON public.conversations;
--    CREATE POLICY "Users can update their own conversations" ON public.conversations
--        FOR UPDATE USING (
--            auth.uid() = student_id OR
--            auth.uid() = mentor_id OR
--            auth.uid() = admin_id OR
--            EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'admin-dev'))
--        );
--
--    DROP POLICY IF EXISTS "Users can view their own conversations" ON public.conversations;
--    CREATE POLICY "Users can view their own conversations" ON public.conversations
--        FOR SELECT USING (
--            auth.uid() = student_id OR
--            auth.uid() = mentor_id OR
--            auth.uid() = admin_id OR
--            EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'admin-dev'))
--        );
--
--    DROP POLICY IF EXISTS "Admins can delete group participants" ON public.conversation_participants;
--    DROP POLICY IF EXISTS "Admins can insert group participants" ON public.conversation_participants;
--    DROP POLICY IF EXISTS "Participants can update their own read state" ON public.conversation_participants;
--    DROP POLICY IF EXISTS "Participants can view group members" ON public.conversation_participants;
--    DROP TABLE IF EXISTS public.conversation_participants;
--
--    DROP FUNCTION IF EXISTS private.is_conversation_participant(UUID);
--
--    DROP INDEX IF EXISTS public.idx_conversations_group_participant_set;
--    ALTER TABLE public.conversations DROP CONSTRAINT IF EXISTS conversations_group_null_pair;
--    ALTER TABLE public.conversations DROP COLUMN IF EXISTS participant_set_key;
--    ALTER TABLE public.conversations DROP CONSTRAINT IF EXISTS conversations_type_check;
--    ALTER TABLE public.conversations
--        ADD CONSTRAINT conversations_type_check
--        CHECK (type IN ('mentor', 'support', 'mentor_support'));
-- ------------------------------------------------------------------
