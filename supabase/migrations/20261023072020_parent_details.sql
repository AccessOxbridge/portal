-- ==========================================
-- Parent accounts, part 3: details kept before linking, child sign-in status
-- Date: 2026-10-22
-- ==========================================
-- No rows change. Requires 20261023072008_parent_access.sql.
--
-- 1. public.parent_profiles: one row per parent account, holding the
--    optional child's first name an admin (later: sales) enters when the
--    parent is created before the student exists. The parent page uses it
--    for "Amelia's portal is being set up". Parents read their own row;
--    admins read all; only the server (service role) writes.
-- 2. public.my_child_has_signed_in(): true once the parent's linked child
--    has signed in at least once ("Account activated" on the onboarding
--    checklist). auth.users is not readable by signed-in users, so this
--    SECURITY DEFINER function answers for the caller's own child only and
--    returns null for anyone without a linked child.
--
-- For every existing user this changes nothing: a new table nobody else
-- reads, and a function that only answers for a linked parent.
-- ==========================================

-- ------------------------------------------------------------------
-- 1. Parent details
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.parent_profiles (
    id                UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    child_first_name  TEXT CHECK (child_first_name IS NULL OR char_length(child_first_name) BETWEEN 1 AND 60),
    created_by        UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.parent_profiles IS
    'Details for parent accounts. child_first_name is optional and only used until the parent is linked to a student. Written by the server only.';

ALTER TABLE public.parent_profiles ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.parent_profiles FROM PUBLIC, anon;
GRANT SELECT ON public.parent_profiles TO authenticated;
GRANT ALL ON public.parent_profiles TO service_role;

CREATE POLICY "Parents see their own details"
    ON public.parent_profiles FOR SELECT TO authenticated
    USING (id = (SELECT auth.uid()) OR (SELECT public.is_portal_admin()));

-- Lookups by student (admin student page, revoke) and by creator.
CREATE INDEX IF NOT EXISTS parent_student_links_student_id_idx
    ON public.parent_student_links (student_id);

-- ------------------------------------------------------------------
-- 2. Has the linked child signed in yet?
-- ------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.my_child_has_signed_in()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT u.last_sign_in_at IS NOT NULL
    FROM auth.users u
    WHERE u.id = (SELECT private.my_child_id());
$$;

REVOKE ALL ON FUNCTION public.my_child_has_signed_in() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_child_has_signed_in() TO authenticated;

-- ------------------------------------------------------------------
-- ROLLBACK (only parent accounts use these)
--
--    DROP FUNCTION IF EXISTS public.my_child_has_signed_in();
--    DROP INDEX IF EXISTS public.parent_student_links_student_id_idx;
--    DROP TABLE IF EXISTS public.parent_profiles;
-- ------------------------------------------------------------------
