-- ==========================================
-- Profiles read scope: same rule, evaluated once per query
-- Date: 2026-10-21
-- ==========================================
-- No rows change. Follow-up to 20261021080739_profiles_read_scope.sql.
--
-- Who can see whom is UNCHANGED. The previous version called
-- private.is_connected_to(id) once for every profile row it checked, which
-- re-scanned sessions/requests/conversations each time. Measured on
-- production right after it shipped: a full profiles read as the busiest
-- mentor took ~67 ms, and a mentor's sessions-with-student-names query
-- ~4 ms (0.2 ms without the rule).
--
-- This version builds the caller's list of connected people once per
-- query (private.my_connected_ids(), wrapped in a scalar subquery so
-- Postgres runs it a single time) and then each row is a cheap array
-- membership check.
--
-- private.is_connected_to() is kept so the rollback below is one statement.
-- ==========================================

CREATE OR REPLACE FUNCTION private.my_connected_ids()
RETURNS UUID[]
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT COALESCE(array_agg(DISTINCT person), '{}')
    FROM (
        SELECT mentor_id AS person FROM public.sessions WHERE student_id = auth.uid()
        UNION SELECT student_id FROM public.sessions WHERE mentor_id = auth.uid()
        UNION SELECT mentor_id FROM public.student_mentor_assignments WHERE student_id = auth.uid()
        UNION SELECT student_id FROM public.student_mentor_assignments WHERE mentor_id = auth.uid()
        UNION SELECT mentor_id FROM public.mentorship_requests WHERE student_id = auth.uid()
        UNION SELECT student_id FROM public.mentorship_requests WHERE mentor_id = auth.uid()
        UNION SELECT unnest(ARRAY[c.student_id, c.mentor_id, c.admin_id])
              FROM public.conversations c
              WHERE auth.uid() IN (c.student_id, c.mentor_id, c.admin_id)
        UNION SELECT them.user_id
              FROM public.conversation_participants me
              JOIN public.conversation_participants them
                ON them.conversation_id = me.conversation_id
              WHERE me.user_id = auth.uid()
    ) connected
    WHERE person IS NOT NULL;
$$;

REVOKE ALL ON FUNCTION private.my_connected_ids() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.my_connected_ids() TO authenticated, service_role;

COMMENT ON FUNCTION private.my_connected_ids() IS
    'Everyone auth.uid() shares a session, mentor assignment, mentorship request, conversation or group conversation with. Same relationships as private.is_connected_to(), computed once per query. Bypasses RLS to avoid policy recursion; not part of the Data API.';

ALTER POLICY "Signed-in users can view profiles" ON public.profiles
    USING (
        id = (SELECT auth.uid())
        OR role IN ('mentor'::public.user_role, 'admin'::public.user_role, 'admin-dev'::public.user_role)
        OR (SELECT public.is_portal_admin())
        OR id = ANY ((SELECT private.my_connected_ids())::UUID[])
    );

-- ------------------------------------------------------------------
-- ROLLBACK
--    Back to the previous (per-row) version, same visibility:
--
--    ALTER POLICY "Signed-in users can view profiles" ON public.profiles
--        USING (
--            id = (SELECT auth.uid())
--            OR role IN ('mentor'::public.user_role, 'admin'::public.user_role, 'admin-dev'::public.user_role)
--            OR (SELECT public.is_portal_admin())
--            OR private.is_connected_to(id)
--        );
--    DROP FUNCTION IF EXISTS private.my_connected_ids();
--
--    Or all the way back to before 20261021080739 (everyone sees everyone):
--    ALTER POLICY "Signed-in users can view profiles" ON public.profiles USING (true);
-- ------------------------------------------------------------------
