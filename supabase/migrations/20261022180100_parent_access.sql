-- ==========================================
-- Parent accounts, part 2: link, read-only access to one child, no writes
-- Date: 2026-10-22
-- ==========================================
-- No rows change. Plan: docs/parent-profile-plan.md. Requires
-- 20261022180000_parent_role.sql.
--
-- 1. public.parent_student_links: one active link per parent and per
--    student (V1 is one-to-one). Only admins create or revoke links.
-- 2. Helpers private.my_child_id() / private.is_parent().
-- 3. Read access for a parent, to their linked child only:
--      sessions, session_reports, student_profiles,
--      student_mentor_assignments, student_session_targets,
--      student_session_milestones, credit_transactions,
--      the child's profile row, and the child's hours in profiles_private.
--    Not: conversations, messages, form_responses (mentor notes),
--    payments, anyone else's anything.
-- 4. Write lockdown: RESTRICTIVE rules so a parent can write nothing in
--    the tables where an "own row" rule exists today. Their only write
--    ("request more hours") will go through a server route.
-- 5. user_issues.reporter_type accepts 'parent' (for that hours request).
--
-- For every existing user these rules change nothing: the new SELECT rules
-- only match a parent's linked child, and the RESTRICTIVE rules only refuse
-- callers whose role is 'parent'.
-- ==========================================

-- ------------------------------------------------------------------
-- 1. Links
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.parent_student_links (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    student_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_by  UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    revoked_at  TIMESTAMPTZ,
    CONSTRAINT parent_student_links_not_self CHECK (parent_id <> student_id)
);

COMMENT ON TABLE public.parent_student_links IS
    'Which student a parent account can see (read-only). One active link per parent and per student in V1. Revoke by setting revoked_at; never delete history.';

CREATE UNIQUE INDEX IF NOT EXISTS parent_student_links_one_active_per_parent
    ON public.parent_student_links (parent_id) WHERE revoked_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS parent_student_links_one_active_per_student
    ON public.parent_student_links (student_id) WHERE revoked_at IS NULL;

-- Both ends must have the right role (checked on insert and when relinked).
CREATE OR REPLACE FUNCTION private.check_parent_student_link()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.parent_id AND role = 'parent'::public.user_role) THEN
        RAISE EXCEPTION 'parent_student_links.parent_id must be a parent account';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.student_id AND role = 'student'::public.user_role) THEN
        RAISE EXCEPTION 'parent_student_links.student_id must be a student account';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS check_parent_student_link ON public.parent_student_links;
CREATE TRIGGER check_parent_student_link
    BEFORE INSERT OR UPDATE OF parent_id, student_id ON public.parent_student_links
    FOR EACH ROW EXECUTE FUNCTION private.check_parent_student_link();

ALTER TABLE public.parent_student_links ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.parent_student_links FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE ON public.parent_student_links TO authenticated;
GRANT ALL ON public.parent_student_links TO service_role;

CREATE POLICY "Parents see their own link"
    ON public.parent_student_links FOR SELECT TO authenticated
    USING (parent_id = (SELECT auth.uid()) OR (SELECT public.is_portal_admin()));

CREATE POLICY "Admins create links"
    ON public.parent_student_links FOR INSERT TO authenticated
    WITH CHECK ((SELECT public.is_portal_admin()));

CREATE POLICY "Admins revoke links"
    ON public.parent_student_links FOR UPDATE TO authenticated
    USING ((SELECT public.is_portal_admin()))
    WITH CHECK ((SELECT public.is_portal_admin()));

-- ------------------------------------------------------------------
-- 2. Helpers (SECURITY DEFINER: no RLS recursion; not part of the Data API)
-- ------------------------------------------------------------------
CREATE OR REPLACE FUNCTION private.my_child_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT l.student_id
    FROM public.parent_student_links l
    JOIN public.profiles me ON me.id = l.parent_id AND me.role = 'parent'::public.user_role
    WHERE l.parent_id = auth.uid() AND l.revoked_at IS NULL
    LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION private.is_parent()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'parent'::public.user_role);
$$;

REVOKE ALL ON FUNCTION private.my_child_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION private.is_parent() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.my_child_id() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_parent() TO authenticated, service_role;

-- ------------------------------------------------------------------
-- 3. Read access to the linked child only
-- ------------------------------------------------------------------
CREATE POLICY "Parents can view their child's sessions"
    ON public.sessions FOR SELECT TO authenticated
    USING (student_id = (SELECT private.my_child_id()));

CREATE POLICY "Parents can view their child's session reports"
    ON public.session_reports FOR SELECT TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.sessions s
        WHERE s.id = session_reports.session_id
          AND s.student_id = (SELECT private.my_child_id())
    ));

CREATE POLICY "Parents can view their child's academic profile"
    ON public.student_profiles FOR SELECT TO authenticated
    USING (id = (SELECT private.my_child_id()));

CREATE POLICY "Parents can view their child's mentor assignments"
    ON public.student_mentor_assignments FOR SELECT TO authenticated
    USING (student_id = (SELECT private.my_child_id()));

CREATE POLICY "Parents can view their child's session target"
    ON public.student_session_targets FOR SELECT TO authenticated
    USING (student_id = (SELECT private.my_child_id()));

CREATE POLICY "Parents can view their child's milestones"
    ON public.student_session_milestones FOR SELECT TO authenticated
    USING (student_id = (SELECT private.my_child_id()));

CREATE POLICY "Parents can view their child's hours history"
    ON public.credit_transactions FOR SELECT TO authenticated
    USING (user_id = (SELECT private.my_child_id()));

-- The child's profile row: add the child to the parent's connected people
-- (same relationships as before for everyone else).
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
        UNION SELECT private.my_child_id()
    ) connected
    WHERE person IS NOT NULL;
$$;

-- The child's hours (credits) in profiles_private; not their email,
-- Stripe id or member code. Same columns, same rules for everyone else.
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
          OR p.id = (SELECT private.my_child_id())
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
   OR p.id = ANY ((SELECT private.my_student_ids())::UUID[])
   OR p.id = (SELECT private.my_child_id());

-- ------------------------------------------------------------------
-- 4. Parents write nothing (RESTRICTIVE: ANDed with every other rule)
-- ------------------------------------------------------------------
DO $$
DECLARE
    t TEXT;
    cmd TEXT;
BEGIN
    FOR t, cmd IN
        SELECT * FROM (VALUES
            ('student_profiles', 'INSERT'), ('student_profiles', 'UPDATE'),
            ('student_satisfaction_surveys', 'INSERT'),
            ('student_session_milestones', 'INSERT'),
            ('session_feedback_prompts', 'INSERT'),
            ('event_registrations', 'INSERT'), ('event_registrations', 'DELETE'),
            ('user_issues', 'INSERT'),
            ('credit_purchases', 'INSERT'),
            ('conversations', 'INSERT'), ('conversations', 'UPDATE'),
            ('conversation_participants', 'UPDATE'),
            ('messages', 'INSERT'), ('messages', 'UPDATE'),
            ('mentorship_requests', 'INSERT'), ('mentorship_requests', 'UPDATE'),
            ('form_responses', 'INSERT')
        ) AS x(t, cmd)
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Parents cannot ' || lower(cmd), t);
        IF cmd = 'INSERT' THEN
            EXECUTE format('CREATE POLICY %I ON public.%I AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (NOT (SELECT private.is_parent()))', 'Parents cannot insert', t);
        ELSIF cmd = 'UPDATE' THEN
            EXECUTE format('CREATE POLICY %I ON public.%I AS RESTRICTIVE FOR UPDATE TO authenticated USING (NOT (SELECT private.is_parent())) WITH CHECK (NOT (SELECT private.is_parent()))', 'Parents cannot update', t);
        ELSE
            EXECUTE format('CREATE POLICY %I ON public.%I AS RESTRICTIVE FOR DELETE TO authenticated USING (NOT (SELECT private.is_parent()))', 'Parents cannot delete', t);
        END IF;
    END LOOP;
END $$;

-- ------------------------------------------------------------------
-- 5. Hours requests from parents (written by the server route)
-- ------------------------------------------------------------------
ALTER TABLE public.user_issues DROP CONSTRAINT IF EXISTS user_issues_reporter_type_check;
ALTER TABLE public.user_issues ADD CONSTRAINT user_issues_reporter_type_check
    CHECK (reporter_type = ANY (ARRAY['mentor'::text, 'student'::text, 'parent'::text]));

-- ------------------------------------------------------------------
-- ROLLBACK (no parent accounts exist until an admin creates one)
--
--    ALTER TABLE public.user_issues DROP CONSTRAINT IF EXISTS user_issues_reporter_type_check;
--    ALTER TABLE public.user_issues ADD CONSTRAINT user_issues_reporter_type_check
--        CHECK (reporter_type = ANY (ARRAY['mentor'::text, 'student'::text]));
--    -- the RESTRICTIVE rules, for each table/command listed in section 4:
--    --   DROP POLICY IF EXISTS "Parents cannot insert" | "Parents cannot update" | "Parents cannot delete" ON public.<table>;
--    DROP POLICY IF EXISTS "Parents can view their child's sessions" ON public.sessions;
--    DROP POLICY IF EXISTS "Parents can view their child's session reports" ON public.session_reports;
--    DROP POLICY IF EXISTS "Parents can view their child's academic profile" ON public.student_profiles;
--    DROP POLICY IF EXISTS "Parents can view their child's mentor assignments" ON public.student_mentor_assignments;
--    DROP POLICY IF EXISTS "Parents can view their child's session target" ON public.student_session_targets;
--    DROP POLICY IF EXISTS "Parents can view their child's milestones" ON public.student_session_milestones;
--    DROP POLICY IF EXISTS "Parents can view their child's hours history" ON public.credit_transactions;
--    -- then re-run 20261022091225_profiles_private_view.sql (view) and
--    -- 20261021081527_profiles_read_scope_fast.sql (my_connected_ids) to
--    -- restore their previous definitions, and finally:
--    DROP FUNCTION IF EXISTS private.my_child_id();
--    DROP FUNCTION IF EXISTS private.is_parent();
--    DROP TABLE IF EXISTS public.parent_student_links;
--    DROP FUNCTION IF EXISTS private.check_parent_student_link();
-- ------------------------------------------------------------------
