-- ==========================================
-- Lock profiles.credits, email, stripe_customer_id
-- Date: 2026-08-27
-- ==========================================
-- ADDITIVE ONLY. This migration never reads, rewrites, or deletes an
-- existing row. It only replaces a trigger function and re-creates a
-- BEFORE UPDATE trigger so additional columns are protected.
--
-- Why: authenticated users can UPDATE their own profiles row. Role is
-- already locked; credits / email / stripe_customer_id were not, so a
-- student could grant themselves hours.
--
-- What still works after this:
--   - Students/mentors editing full_name and photo_url
--   - Admin / service_role credit grants (Stripe, Zoom, Create Account)
--   - Existing protect_profiles_role behaviour for id and role
-- ==========================================

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

    IF NEW.credits IS DISTINCT FROM OLD.credits
       AND NOT public.is_privileged_profile_actor() THEN
        RAISE EXCEPTION 'profiles.credits cannot be changed';
    END IF;

    IF NEW.email IS DISTINCT FROM OLD.email
       AND NOT public.is_privileged_profile_actor() THEN
        RAISE EXCEPTION 'profiles.email cannot be changed';
    END IF;

    IF NEW.stripe_customer_id IS DISTINCT FROM OLD.stripe_customer_id
       AND NOT public.is_privileged_profile_actor() THEN
        RAISE EXCEPTION 'profiles.stripe_customer_id cannot be changed';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_profiles_role ON public.profiles;
CREATE TRIGGER protect_profiles_role
    BEFORE UPDATE OF id, role, credits, email, stripe_customer_id ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.protect_profiles_role();

-- ------------------------------------------------------------------
-- Rollback (do not run unless reverting this migration):
--   CREATE OR REPLACE FUNCTION public.protect_profiles_role()
--   RETURNS trigger
--   LANGUAGE plpgsql
--   SECURITY INVOKER
--   SET search_path = public
--   AS $$
--   BEGIN
--       IF NEW.id IS DISTINCT FROM OLD.id THEN
--           RAISE EXCEPTION 'profiles.id cannot be changed';
--       END IF;
--       IF NEW.role IS DISTINCT FROM OLD.role
--          AND NOT public.is_privileged_profile_actor() THEN
--           RAISE EXCEPTION 'profiles.role cannot be changed';
--       END IF;
--       RETURN NEW;
--   END;
--   $$;
--   DROP TRIGGER IF EXISTS protect_profiles_role ON public.profiles;
--   CREATE TRIGGER protect_profiles_role
--       BEFORE UPDATE OF id, role ON public.profiles
--       FOR EACH ROW
--       EXECUTE FUNCTION public.protect_profiles_role();
-- ------------------------------------------------------------------
