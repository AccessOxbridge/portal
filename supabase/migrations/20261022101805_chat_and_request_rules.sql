-- ==========================================
-- Chats, messages, reports and requests: only with people you work with
-- Date: 2026-10-22 (applied to production 2026-10-22)
-- ==========================================
-- No rows change. Findings 6–11 of the 22 Oct write-rule audit
-- (docs/write-rule-audit.md). These must be in place before any parent
-- account exists: today any signed-in account can open a chat with, or send
-- a session request to, any mentor.
--
--  6. conversations INSERT: was "you are student_id OR mentor_id, or you are
--     a mentor/admin" (so any student could chat any mentor, any mentor
--     could create any conversation). Now:
--       - admins: any conversation (unchanged);
--       - students: as themselves, with a mentor they are connected to
--         (assignment, session, request, chat) or a support chat;
--       - mentors: as themselves, with one of their own students or a
--         support chat;
--       - any admin_id must belong to an admin.
--  7. conversations UPDATE: members could change student_id/mentor_id/type.
--     Signed-in users may now only update last_message_at (what the app
--     does). The service role is unaffected.
--  8. conversation_participants UPDATE: a member could move their row to
--     another group. Now only last_read_at.
--  9. messages UPDATE: a recipient could edit a message's content. Now only
--     is_read.
-- 10. form_responses INSERT: any session. Now a mentor_report only for a
--     session you mentored, a student_feedback only for your own session.
-- 11. mentorship_requests: students/mentors could send a request to anyone
--     and edit any column. Now only with a current/past assigned or
--     session counterpart, and updates are limited to status.
--
-- "Admins" means profiles.role admin or admin-dev (public.is_portal_admin()).
-- admin-dev can also act as a student or mentor, as before.
-- ==========================================

-- ------------------------------------------------------------------
-- 6. conversations INSERT
-- ------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;

CREATE POLICY "Admins can create conversations"
    ON public.conversations FOR INSERT
    TO authenticated
    WITH CHECK (public.is_portal_admin());

CREATE POLICY "Students can open chats with their mentors or support"
    ON public.conversations FOR INSERT
    TO authenticated
    WITH CHECK (
        student_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.profiles me
            WHERE me.id = auth.uid()
              AND me.role IN ('student'::public.user_role, 'admin-dev'::public.user_role)
        )
        AND type IN ('mentor', 'support')
        AND (mentor_id IS NULL OR mentor_id = ANY ((SELECT private.my_connected_ids())::UUID[]))
        AND (
            admin_id IS NULL
            OR EXISTS (
                SELECT 1 FROM public.profiles a
                WHERE a.id = admin_id
                  AND a.role IN ('admin'::public.user_role, 'admin-dev'::public.user_role)
            )
        )
    );

CREATE POLICY "Mentors can open chats with their students or support"
    ON public.conversations FOR INSERT
    TO authenticated
    WITH CHECK (
        mentor_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.profiles me
            WHERE me.id = auth.uid()
              AND me.role IN ('mentor'::public.user_role, 'admin-dev'::public.user_role)
        )
        AND type IN ('mentor', 'mentor_support')
        AND (student_id IS NULL OR student_id = ANY ((SELECT private.my_student_ids())::UUID[]))
        AND (
            admin_id IS NULL
            OR EXISTS (
                SELECT 1 FROM public.profiles a
                WHERE a.id = admin_id
                  AND a.role IN ('admin'::public.user_role, 'admin-dev'::public.user_role)
            )
        )
    );

-- ------------------------------------------------------------------
-- 7–9. Column-level UPDATE: only what the app changes with a user's client
-- ------------------------------------------------------------------
REVOKE UPDATE ON public.conversations FROM anon, authenticated;
GRANT UPDATE (last_message_at) ON public.conversations TO authenticated;

REVOKE UPDATE ON public.conversation_participants FROM anon, authenticated;
GRANT UPDATE (last_read_at) ON public.conversation_participants TO authenticated;

REVOKE UPDATE ON public.messages FROM anon, authenticated;
GRANT UPDATE (is_read) ON public.messages TO authenticated;

-- ------------------------------------------------------------------
-- 10. form_responses INSERT: only for your own session, in your own role
-- ------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can insert their own form responses" ON public.form_responses;

CREATE POLICY "Users can respond for their own sessions"
    ON public.form_responses FOR INSERT
    WITH CHECK (
        respondent_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.sessions s
            WHERE s.id = form_responses.session_id
              AND (
                  (form_responses.form_type = 'mentor_report' AND s.mentor_id = auth.uid())
                  OR (form_responses.form_type = 'student_feedback' AND s.student_id = auth.uid())
              )
        )
    );

-- ------------------------------------------------------------------
-- 11. mentorship_requests: only with your own counterpart; status-only updates
-- ------------------------------------------------------------------
DROP POLICY IF EXISTS "Students can insert mentorship requests" ON public.mentorship_requests;
DROP POLICY IF EXISTS "Mentors can insert mentorship requests for their students" ON public.mentorship_requests;

CREATE POLICY "Students can request sessions with their own mentors"
    ON public.mentorship_requests FOR INSERT
    TO authenticated
    WITH CHECK (
        student_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.profiles me
            WHERE me.id = auth.uid()
              AND me.role IN ('student'::public.user_role, 'admin-dev'::public.user_role)
        )
        AND (
            EXISTS (
                SELECT 1 FROM public.student_mentor_assignments a
                WHERE a.student_id = auth.uid() AND a.mentor_id = mentorship_requests.mentor_id
            )
            OR EXISTS (
                SELECT 1 FROM public.sessions s
                WHERE s.student_id = auth.uid() AND s.mentor_id = mentorship_requests.mentor_id
            )
        )
    );

CREATE POLICY "Mentors can request sessions with their own students"
    ON public.mentorship_requests FOR INSERT
    TO authenticated
    WITH CHECK (
        mentor_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.profiles me
            WHERE me.id = auth.uid()
              AND me.role IN ('mentor'::public.user_role, 'admin-dev'::public.user_role)
        )
        AND (
            EXISTS (
                SELECT 1 FROM public.student_mentor_assignments a
                WHERE a.mentor_id = auth.uid() AND a.student_id = mentorship_requests.student_id
            )
            OR EXISTS (
                SELECT 1 FROM public.sessions s
                WHERE s.mentor_id = auth.uid() AND s.student_id = mentorship_requests.student_id
            )
        )
    );

REVOKE UPDATE ON public.mentorship_requests FROM anon, authenticated;
GRANT UPDATE (status) ON public.mentorship_requests TO authenticated;

-- ------------------------------------------------------------------
-- ROLLBACK (restores the previous rules and privileges exactly)
--
--    DROP POLICY IF EXISTS "Admins can create conversations" ON public.conversations;
--    DROP POLICY IF EXISTS "Students can open chats with their mentors or support" ON public.conversations;
--    DROP POLICY IF EXISTS "Mentors can open chats with their students or support" ON public.conversations;
--    CREATE POLICY "Users can create conversations" ON public.conversations FOR INSERT
--        WITH CHECK ((auth.uid() = student_id) OR (auth.uid() = mentor_id) OR (EXISTS (
--            SELECT 1 FROM profiles WHERE profiles.id = auth.uid()
--              AND profiles.role = ANY (ARRAY['admin'::user_role, 'admin-dev'::user_role, 'mentor'::user_role]))));
--
--    GRANT UPDATE ON public.conversations TO anon, authenticated;
--    GRANT UPDATE ON public.conversation_participants TO anon, authenticated;
--    GRANT UPDATE ON public.messages TO anon, authenticated;
--    GRANT UPDATE ON public.mentorship_requests TO anon, authenticated;
--
--    DROP POLICY IF EXISTS "Users can respond for their own sessions" ON public.form_responses;
--    CREATE POLICY "Users can insert their own form responses" ON public.form_responses
--        FOR INSERT WITH CHECK (auth.uid() = respondent_id);
--
--    DROP POLICY IF EXISTS "Students can request sessions with their own mentors" ON public.mentorship_requests;
--    DROP POLICY IF EXISTS "Mentors can request sessions with their own students" ON public.mentorship_requests;
--    CREATE POLICY "Students can insert mentorship requests" ON public.mentorship_requests
--        FOR INSERT TO authenticated WITH CHECK (auth.uid() = student_id);
--    CREATE POLICY "Mentors can insert mentorship requests for their students" ON public.mentorship_requests
--        FOR INSERT TO authenticated WITH CHECK (auth.uid() = mentor_id);
-- ------------------------------------------------------------------
