-- Let enabled sales accounts use the existing audited account-access RPC for
-- parent accounts only. Administrators retain their existing access to every
-- supported account type, including the new sales role.
--
-- Requires 20261027120000_sales_role.sql. No existing rows are changed.

SET LOCAL lock_timeout = '2s';
SET LOCAL statement_timeout = '10s';

CREATE OR REPLACE FUNCTION public.admin_set_account_enabled(p_user_id uuid, p_enabled boolean) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
    actor uuid := auth.uid();
    actor_role text;
    target_role text;
    was_disabled boolean;
    invoice_count integer;
    payout_count integer;
    unbilled_count integer;
BEGIN
    -- Serialise access changes, including two administrators disabling each other.
    PERFORM pg_advisory_xact_lock(27083312);
    IF actor IS NULL OR NOT private.current_account_enabled() THEN
        RAISE EXCEPTION 'Staff access is required.' USING ERRCODE = '42501';
    END IF;
    SELECT role::text INTO actor_role FROM public.profiles WHERE id = actor;
    IF actor_role NOT IN ('admin', 'admin-dev', 'sales') THEN
        RAISE EXCEPTION 'Staff access is required.' USING ERRCODE = '42501';
    END IF;
    IF p_enabled IS NULL OR p_user_id IS NULL THEN
        RAISE EXCEPTION 'Choose an account and an access state.' USING ERRCODE = '22023';
    END IF;
    SELECT role::text INTO target_role FROM public.profiles WHERE id = p_user_id FOR UPDATE;
    IF target_role IS NULL OR target_role NOT IN ('student', 'mentor', 'parent', 'admin', 'admin-dev', 'sales') THEN
        RAISE EXCEPTION 'This account cannot be managed here.' USING ERRCODE = '22023';
    END IF;
    IF actor_role = 'sales' AND target_role <> 'parent' THEN
        RAISE EXCEPTION 'Sales accounts can only manage parent access.' USING ERRCODE = '42501';
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

-- ROLLBACK
-- Restore public.admin_set_account_enabled(uuid, boolean) from
-- 20261027102918_account_access_controls.sql. Existing audit rows stay intact.
