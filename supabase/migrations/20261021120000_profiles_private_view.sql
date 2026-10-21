-- ==========================================
-- Profiles private fields, part A: add profiles_private (additive only)
-- Date: 2026-10-21
-- ==========================================
-- No rows change and nothing loses access. Adds private.my_student_ids()
-- and the public.profiles_private view, the place app code reads email,
-- credits, stripe_customer_id and member_code from.
--
-- Rollout order (each step safe on its own):
--   1. this migration (A);
--   2. deploy app code that reads those four fields from profiles_private
--      (or the service-role client) instead of public.profiles;
--   3. 20261021120100_profiles_private_columns.sql (B): removes direct
--      read access to the four columns on public.profiles.
--
-- What profiles_private returns (plus id, full_name, role, photo_url,
-- updated_at for the same rows):
--   - your own row: all four;
--   - admins and the service role: all four for everyone;
--   - mentors: the email of their own students (current or past
--     assignment, a session, or a request with them), nothing else.
-- ==========================================

-- ------------------------------------------------------------------
-- 1. Helper: students this mentor works with (computed once per query)
-- ------------------------------------------------------------------
CREATE OR REPLACE FUNCTION private.my_student_ids()
RETURNS UUID[]
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT COALESCE(array_agg(DISTINCT student), '{}')
    FROM (
        SELECT student_id AS student FROM public.student_mentor_assignments WHERE mentor_id = auth.uid()
        UNION SELECT student_id FROM public.sessions WHERE mentor_id = auth.uid()
        UNION SELECT student_id FROM public.mentorship_requests WHERE mentor_id = auth.uid()
    ) mine
    WHERE student IS NOT NULL;
$$;

REVOKE ALL ON FUNCTION private.my_student_ids() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.my_student_ids() TO authenticated, service_role;

COMMENT ON FUNCTION private.my_student_ids() IS
    'Students auth.uid() mentors (assignment, session or request). Used by public.profiles_private to show mentors their own students'' emails. Bypasses RLS; not part of the Data API.';

-- ------------------------------------------------------------------
-- 2. The only place the four private columns can be read from now
--    Owned by postgres (bypasses profiles RLS and column grants), so the
--    WHERE clause and CASE masks below are the whole access rule.
-- ------------------------------------------------------------------
CREATE OR REPLACE VIEW public.profiles_private
WITH (security_barrier = true)
AS
SELECT
    p.id,
    p.full_name,
    p.role,
    p.photo_url,
    p.updated_at,
    CASE
        WHEN p.id = (SELECT auth.uid())
          OR (SELECT public.is_portal_admin())
          OR (SELECT auth.role()) = 'service_role'
          OR p.id = ANY ((SELECT private.my_student_ids())::UUID[])
        THEN p.email
    END AS email,
    CASE
        WHEN p.id = (SELECT auth.uid()) OR (SELECT public.is_portal_admin()) OR (SELECT auth.role()) = 'service_role'
        THEN p.credits
    END AS credits,
    CASE
        WHEN p.id = (SELECT auth.uid()) OR (SELECT public.is_portal_admin()) OR (SELECT auth.role()) = 'service_role'
        THEN p.stripe_customer_id
    END AS stripe_customer_id,
    CASE
        WHEN p.id = (SELECT auth.uid()) OR (SELECT public.is_portal_admin()) OR (SELECT auth.role()) = 'service_role'
        THEN p.member_code
    END AS member_code
FROM public.profiles p
WHERE p.id = (SELECT auth.uid())
   OR (SELECT public.is_portal_admin())
   OR (SELECT auth.role()) = 'service_role'
   OR p.id = ANY ((SELECT private.my_student_ids())::UUID[]);

REVOKE ALL ON public.profiles_private FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.profiles_private TO authenticated, service_role;

COMMENT ON VIEW public.profiles_private IS
    'email/credits/stripe_customer_id/member_code: own row, admins and the service role see all four; mentors see their own students'' email only. Rows outside that are not returned.';

-- ------------------------------------------------------------------
-- 3. ROLLBACK (only after B is rolled back and app code no longer reads
--    profiles_private)
--
--    DROP VIEW IF EXISTS public.profiles_private;
--    DROP FUNCTION IF EXISTS private.my_student_ids();
-- ------------------------------------------------------------------
