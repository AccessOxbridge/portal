-- ==========================================
-- Lock down profiles.role and mentors.status
-- Date: 2026-08-20
-- ==========================================
-- ADDITIVE ONLY. This migration never reads, rewrites, or deletes an
-- existing row. It only adds trigger functions, BEFORE UPDATE triggers,
-- and replaces one INSERT policy with a tighter WITH CHECK.
--
-- Why: authenticated users could UPDATE their own profiles.role (including
-- to admin) and mentors.status (including to active, skipping approval).
-- Public mentor registration makes those holes exploitable. This closes
-- them without touching existing data.
--
-- What still works after this:
--   - Mentor onboarding: details_required -> pending_approval (own row)
--   - Admin approvals / MentorActions: any status change
--   - Stripe Connect: stripe_account_id / payouts_enabled (not locked)
--   - Profile photo/name/bio updates (role/status unchanged)
--   - handle_new_user / import-mentors / registerPremiumClient
--     (service_role, postgres, or SECURITY DEFINER)
-- ==========================================

-- ------------------------------------------------------------------
-- 1. Helper: is this UPDATE coming from staff / the database itself?
-- ------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_privileged_profile_actor()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
    SELECT
        COALESCE(auth.role(), '') = 'service_role'
        OR current_user IN ('postgres', 'supabase_admin', 'supabase_auth_admin')
        OR EXISTS (
            SELECT 1
            FROM public.profiles p
            WHERE p.id = auth.uid()
              AND p.role IN ('admin'::public.user_role, 'admin-dev'::public.user_role)
        );
$$;

REVOKE ALL ON FUNCTION public.is_privileged_profile_actor() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_privileged_profile_actor() TO authenticated, service_role;

-- ------------------------------------------------------------------
-- 2. profiles.role cannot be changed by the row owner
-- ------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.protect_profiles_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
    IF NEW.id IS DISTINCT FROM OLD.id THEN
        RAISE EXCEPTION 'profiles.id cannot be changed';
    END IF;

    IF NEW.role IS DISTINCT FROM OLD.role
       AND NOT public.is_privileged_profile_actor() THEN
        RAISE EXCEPTION 'profiles.role cannot be changed';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_profiles_role ON public.profiles;
CREATE TRIGGER protect_profiles_role
    BEFORE UPDATE OF id, role ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.protect_profiles_role();

REVOKE ALL ON FUNCTION public.protect_profiles_role() FROM PUBLIC;

-- ------------------------------------------------------------------
-- 3. mentors.status / embedding / hourly_rate_cents
--    Mentors may only move details_required -> pending_approval
--    (the onboarding submit path). Everything else is staff-only.
--    stripe_account_id and payouts_enabled are NOT locked: Stripe
--    Connect writes those with the mentor's own session.
-- ------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.protect_mentors_privileged_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
    IF public.is_privileged_profile_actor() THEN
        RETURN NEW;
    END IF;

    IF NEW.id IS DISTINCT FROM OLD.id THEN
        RAISE EXCEPTION 'mentors.id cannot be changed';
    END IF;

    IF NEW.status IS DISTINCT FROM OLD.status THEN
        IF NOT (
            OLD.status = 'details_required'::public.mentor_status
            AND NEW.status = 'pending_approval'::public.mentor_status
            AND NEW.id = auth.uid()
        ) THEN
            RAISE EXCEPTION 'mentors.status cannot be changed';
        END IF;
    END IF;

    IF NEW.embedding IS DISTINCT FROM OLD.embedding THEN
        RAISE EXCEPTION 'mentors.embedding cannot be changed';
    END IF;

    IF NEW.hourly_rate_cents IS DISTINCT FROM OLD.hourly_rate_cents THEN
        RAISE EXCEPTION 'mentors.hourly_rate_cents cannot be changed';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_mentors_privileged_columns ON public.mentors;
CREATE TRIGGER protect_mentors_privileged_columns
    BEFORE UPDATE OF id, status, embedding, hourly_rate_cents ON public.mentors
    FOR EACH ROW
    EXECUTE FUNCTION public.protect_mentors_privileged_columns();

REVOKE ALL ON FUNCTION public.protect_mentors_privileged_columns() FROM PUBLIC;

-- ------------------------------------------------------------------
-- 4. Self-insert may only create student or mentor rows, never admin
--    handle_new_user() is SECURITY DEFINER and still inserts any role.
-- ------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can insert their own profile." ON public.profiles;
CREATE POLICY "Users can insert their own profile."
    ON public.profiles
    FOR INSERT
    WITH CHECK (
        (SELECT auth.uid()) = id
        AND role IN ('student'::public.user_role, 'mentor'::public.user_role)
    );

-- ------------------------------------------------------------------
-- Rollback (do not run unless reverting this migration):
--   DROP TRIGGER IF EXISTS protect_profiles_role ON public.profiles;
--   DROP TRIGGER IF EXISTS protect_mentors_privileged_columns ON public.mentors;
--   DROP FUNCTION IF EXISTS public.protect_profiles_role();
--   DROP FUNCTION IF EXISTS public.protect_mentors_privileged_columns();
--   DROP FUNCTION IF EXISTS public.is_privileged_profile_actor();
--   DROP POLICY IF EXISTS "Users can insert their own profile." ON public.profiles;
--   CREATE POLICY "Users can insert their own profile." ON public.profiles
--       FOR INSERT WITH CHECK ((SELECT auth.uid()) = id);
-- ------------------------------------------------------------------
