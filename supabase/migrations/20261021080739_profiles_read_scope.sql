-- ==========================================
-- Profiles: you only see the people you deal with
-- Date: 2026-10-21
-- ==========================================
-- No rows change. This adds one helper function and narrows the USING clause
-- of the existing SELECT policy on public.profiles. Nothing is inserted,
-- updated or deleted, and no other table, policy or grant is touched.
--
-- Why: "Signed-in users can view profiles" was USING (true), so any logged-in
-- student or mentor could list every user's name, email and credits from the
-- browser. Parent accounts (planned) would inherit that.
--
-- After this, a signed-in user can read a profile row when:
--   * it is their own row;
--   * they are an admin or admin-dev (unchanged: admins see everyone);
--   * the row is a mentor, admin or admin-dev (students browse mentors and
--     see admin names in support chats);
--   * they are connected to that person through a session, a mentor
--     assignment, a mentorship request, a 1:1 conversation or a shared group
--     conversation.
--
-- Checked read-only against production on 2026-10-21: of the 236 distinct
-- (viewer, person) pairs that existing sessions, assignments, requests,
-- conversations, group members, message senders and form responses point
-- at, 0 would be blocked. No student sees another student outside a group
-- chat they are both in.
--
-- Unaffected:
--   * service-role code (crons, webhooks, admin client) bypasses RLS;
--   * mentors_directory is owned by postgres and bypasses RLS;
--   * every other policy that looks up profiles only reads the caller's own
--     row (id = auth.uid()), which stays visible.
-- ==========================================

-- ------------------------------------------------------------------
-- 1. Helper: is the caller connected to this person?
--    SECURITY DEFINER so it can read sessions/conversations without
--    recursing through their own RLS (and through profiles' RLS).
-- ------------------------------------------------------------------
CREATE OR REPLACE FUNCTION private.is_connected_to(target UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.sessions s
        WHERE (s.student_id = auth.uid() AND s.mentor_id = target)
           OR (s.mentor_id = auth.uid() AND s.student_id = target)
    )
    OR EXISTS (
        SELECT 1 FROM public.student_mentor_assignments a
        WHERE (a.student_id = auth.uid() AND a.mentor_id = target)
           OR (a.mentor_id = auth.uid() AND a.student_id = target)
    )
    OR EXISTS (
        SELECT 1 FROM public.mentorship_requests r
        WHERE (r.student_id = auth.uid() AND r.mentor_id = target)
           OR (r.mentor_id = auth.uid() AND r.student_id = target)
    )
    OR EXISTS (
        SELECT 1 FROM public.conversations c
        WHERE auth.uid() IN (c.student_id, c.mentor_id, c.admin_id)
          AND target IN (c.student_id, c.mentor_id, c.admin_id)
    )
    OR EXISTS (
        SELECT 1
        FROM public.conversation_participants me
        JOIN public.conversation_participants them
          ON them.conversation_id = me.conversation_id
        WHERE me.user_id = auth.uid()
          AND them.user_id = target
    );
$$;

REVOKE ALL ON FUNCTION private.is_connected_to(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.is_connected_to(UUID) TO authenticated, service_role;

COMMENT ON FUNCTION private.is_connected_to(UUID) IS
    'True when auth.uid() shares a session, mentor assignment, mentorship request, conversation or group conversation with target. Bypasses RLS to avoid policy recursion; not part of the Data API.';

-- ------------------------------------------------------------------
-- 2. Narrow the existing SELECT policy (same name, same role).
--    is_portal_admin() already exists (SECURITY DEFINER, reads only the
--    caller's own row).
-- ------------------------------------------------------------------
ALTER POLICY "Signed-in users can view profiles" ON public.profiles
    USING (
        id = (SELECT auth.uid())
        OR role IN ('mentor'::public.user_role, 'admin'::public.user_role, 'admin-dev'::public.user_role)
        OR (SELECT public.is_portal_admin())
        OR private.is_connected_to(id)
    );

-- ------------------------------------------------------------------
-- 3. ROLLBACK
--    Restores the previous behaviour exactly (every signed-in user reads
--    every profile). Safe to run at any time; no data is involved.
--
--    ALTER POLICY "Signed-in users can view profiles" ON public.profiles USING (true);
--    DROP FUNCTION IF EXISTS private.is_connected_to(UUID);
-- ------------------------------------------------------------------
