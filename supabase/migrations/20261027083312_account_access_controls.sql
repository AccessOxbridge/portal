-- Reversible account access, separate from profiles and historical records.
-- No existing rows are changed. Apply locally first; production needs approval.

CREATE TABLE public.account_access (
    user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE RESTRICT,
    disabled_at timestamptz,
    changed_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    changed_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.account_access_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    actor_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    enabled boolean NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX account_access_disabled ON public.account_access(user_id) WHERE disabled_at IS NOT NULL;
CREATE INDEX account_access_events_user ON public.account_access_events(user_id, created_at DESC);
ALTER TABLE public.account_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_access_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.account_access, public.account_access_events FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.account_access, public.account_access_events TO authenticated;
GRANT ALL ON public.account_access, public.account_access_events TO service_role;

CREATE FUNCTION private.current_account_enabled() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
    SELECT NOT EXISTS (
        SELECT 1 FROM public.account_access a
        WHERE a.user_id = (SELECT auth.uid()) AND a.disabled_at IS NOT NULL
    )
$$;
REVOKE ALL ON FUNCTION private.current_account_enabled() FROM PUBLIC, anon;
-- Anonymous access remains as before on views already granted to anon. With
-- no auth.uid() this no-argument helper returns true and exposes no user data.
GRANT EXECUTE ON FUNCTION private.current_account_enabled() TO anon, authenticated, service_role;

CREATE POLICY account_access_read ON public.account_access FOR SELECT TO authenticated
USING (user_id = (SELECT auth.uid()) OR (
    (SELECT private.current_account_enabled()) AND EXISTS (
        SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role::text IN ('admin', 'admin-dev')
    )
));
CREATE POLICY account_access_events_read ON public.account_access_events FOR SELECT TO authenticated
USING ((SELECT private.current_account_enabled()) AND EXISTS (
    SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role::text IN ('admin', 'admin-dev')
));

-- Restrictive policies combine with existing policies, never replace them.
-- They also close access for JWTs issued before the account was disabled.
DO $$
DECLARE t record;
BEGIN
    FOR t IN SELECT n.nspname, c.relname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relkind IN ('r', 'p') AND c.relrowsecurity
        AND ((n.nspname = 'public' AND c.relname NOT IN ('account_access', 'account_access_events'))
            OR (n.nspname = 'storage' AND c.relname = 'objects'))
    LOOP
        EXECUTE format('CREATE POLICY account_must_be_enabled ON %I.%I AS RESTRICTIVE FOR ALL TO authenticated USING ((SELECT private.current_account_enabled())) WITH CHECK ((SELECT private.current_account_enabled()))', t.nspname, t.relname);
    END LOOP;
END $$;

-- Owner-rights views bypass their base tables' RLS. Preserve definitions,
-- ownership and grants, adding only an enabled-caller predicate.
DO $guard$
DECLARE v record;
BEGIN
    FOR v IN SELECT c.relname, pg_get_viewdef(c.oid, true) AS definition
        FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relkind = 'v'
    LOOP
        EXECUTE format('CREATE OR REPLACE VIEW public.%I AS SELECT * FROM (%s) account_guarded WHERE (SELECT auth.uid()) IS NULL OR (SELECT private.current_account_enabled())',
            v.relname, regexp_replace(v.definition, ';[[:space:]]*$', ''));
    END LOOP;
END $guard$;

-- SECURITY DEFINER RPCs bypass RLS. A statement trigger still rejects writes
-- from disabled JWTs, including writes made inside older privileged RPCs.
CREATE FUNCTION private.reject_disabled_actor() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
    IF auth.uid() IS NOT NULL AND NOT private.current_account_enabled() THEN
        RAISE EXCEPTION 'Your account has been disabled. Please contact the administrator.' USING ERRCODE = '42501';
    END IF;
    RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION private.reject_disabled_actor() FROM PUBLIC, anon, authenticated;
DO $$
DECLARE t record;
BEGIN
    FOR t IN SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relkind = 'r'
    LOOP
        EXECUTE format('CREATE TRIGGER reject_disabled_actor BEFORE INSERT OR UPDATE OR DELETE ON public.%I FOR EACH STATEMENT EXECUTE FUNCTION private.reject_disabled_actor()', t.relname);
    END LOOP;
END $$;

CREATE FUNCTION public.admin_set_account_enabled(p_user_id uuid, p_enabled boolean) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
    actor uuid := auth.uid();
    target_role text;
    was_disabled boolean;
    invoice_count integer;
    payout_count integer;
    unbilled_count integer;
BEGIN
    -- Serialise access changes, including two admins disabling each other.
    PERFORM pg_advisory_xact_lock(27083312);
    IF actor IS NULL OR NOT private.current_account_enabled() OR NOT EXISTS (
        SELECT 1 FROM public.profiles WHERE id = actor AND role::text IN ('admin', 'admin-dev')
    ) THEN
        RAISE EXCEPTION 'Administrator access is required.' USING ERRCODE = '42501';
    END IF;
    IF p_enabled IS NULL OR p_user_id IS NULL THEN
        RAISE EXCEPTION 'Choose an account and an access state.' USING ERRCODE = '22023';
    END IF;
    SELECT role::text INTO target_role FROM public.profiles WHERE id = p_user_id FOR UPDATE;
    IF target_role IS NULL OR target_role NOT IN ('student', 'mentor', 'parent', 'admin', 'admin-dev') THEN
        RAISE EXCEPTION 'This account cannot be managed here.' USING ERRCODE = '22023';
    END IF;
    IF actor = p_user_id AND NOT p_enabled THEN
        RAISE EXCEPTION 'You cannot disable your own account.' USING ERRCODE = '22023';
    END IF;
    SELECT EXISTS (SELECT 1 FROM public.account_access WHERE user_id = p_user_id AND disabled_at IS NOT NULL) INTO was_disabled;
    IF was_disabled = NOT p_enabled THEN RETURN; END IF;
    IF NOT p_enabled AND target_role IN ('admin', 'admin-dev') AND NOT EXISTS (
        SELECT 1 FROM public.profiles p WHERE p.role::text IN ('admin', 'admin-dev') AND p.id <> p_user_id
        AND NOT EXISTS (SELECT 1 FROM public.account_access a WHERE a.user_id = p.id AND a.disabled_at IS NOT NULL)
    ) THEN
        RAISE EXCEPTION 'The last enabled administrator cannot be disabled.' USING ERRCODE = '22023';
    END IF;
    IF NOT p_enabled AND target_role = 'mentor' THEN
        SELECT count(*) INTO invoice_count FROM public.mentor_invoices WHERE mentor_id = p_user_id AND status IN ('draft', 'submitted');
        SELECT count(*) INTO payout_count FROM public.mentor_payouts WHERE mentor_id = p_user_id AND status IN ('pending', 'processing', 'failed');
        SELECT count(*) INTO unbilled_count FROM public.sessions s
            WHERE s.mentor_id = p_user_id AND s.invoice_id IS NULL
            AND (s.status = 'completed' OR s.zoom_meeting_status = 'ended')
            AND (s.actual_minutes IS NULL OR s.actual_minutes >= 15)
            AND NOT EXISTS (SELECT 1 FROM public.mentor_payout_items i JOIN public.mentor_payouts p ON p.id = i.payout_id WHERE i.session_id = s.id AND p.status = 'paid');
        IF invoice_count + payout_count + unbilled_count > 0 THEN
            RAISE EXCEPTION 'This mentor has % outstanding invoice(s), % unresolved payout(s) and % unbilled session(s). Resolve these before disabling the account.', invoice_count, payout_count, unbilled_count USING ERRCODE = '22023';
        END IF;
    END IF;
    INSERT INTO public.account_access(user_id, disabled_at, changed_by, changed_at)
        VALUES (p_user_id, CASE WHEN p_enabled THEN NULL ELSE now() END, actor, now())
        ON CONFLICT (user_id) DO UPDATE SET disabled_at = excluded.disabled_at, changed_by = excluded.changed_by, changed_at = excluded.changed_at;
    INSERT INTO public.account_access_events(user_id, actor_id, enabled) VALUES (p_user_id, actor, p_enabled);
END $$;
REVOKE ALL ON FUNCTION public.admin_set_account_enabled(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_account_enabled(uuid, boolean) TO authenticated;

-- New bookings, requests and assignments cannot target a disabled person.
-- Existing relationships and historical rows are deliberately left intact.
CREATE FUNCTION private.require_enabled_participants() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
    PERFORM pg_advisory_xact_lock(27083312);
    IF EXISTS (SELECT 1 FROM public.account_access WHERE user_id IN (NEW.student_id, NEW.mentor_id) AND disabled_at IS NOT NULL) THEN
        RAISE EXCEPTION 'A selected account has been disabled. Choose an enabled student and mentor.' USING ERRCODE = '22023';
    END IF;
    RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION private.require_enabled_participants() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER require_enabled_participants BEFORE INSERT OR UPDATE OF student_id, mentor_id ON public.sessions FOR EACH ROW EXECUTE FUNCTION private.require_enabled_participants();
CREATE TRIGGER require_enabled_participants BEFORE INSERT OR UPDATE OF student_id, mentor_id ON public.mentorship_requests FOR EACH ROW EXECUTE FUNCTION private.require_enabled_participants();
CREATE TRIGGER require_enabled_participants BEFORE INSERT OR UPDATE OF student_id, mentor_id, is_current ON public.student_mentor_assignments FOR EACH ROW WHEN (NEW.is_current) EXECUTE FUNCTION private.require_enabled_participants();

-- Rollback (restore application code first; retain access/event records):
-- Drop the three require_enabled_participants triggers and their function.
-- For each public table, DROP TRIGGER IF EXISTS reject_disabled_actor ON <table>.
-- For each RLS table in public and storage.objects,
-- DROP POLICY IF EXISTS account_must_be_enabled ON <table>.
-- DROP FUNCTION public.admin_set_account_enabled(uuid, boolean);
-- DROP FUNCTION private.reject_disabled_actor();
-- Drop account_access_read / account_access_events_read policies, then
-- Restore the guarded views' previous behaviour without changing their shape:
-- CREATE OR REPLACE FUNCTION private.current_account_enabled() RETURNS boolean
-- LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS 'SELECT true';
-- Keep this function while view predicates reference it.
-- Keep account_access and account_access_events for audit; no data deletion.
