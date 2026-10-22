-- ==========================================
-- Sign-up: never take a privileged role from user-supplied metadata
-- Date: 2026-10-22
-- ==========================================
-- No rows change. Replaces public.handle_new_user() (the on_auth_user_created
-- trigger on auth.users).
--
-- Before: the profile role was copied from raw_user_meta_data->>'role',
-- which whoever signs up controls. With Supabase public sign-up enabled
-- (it was until 22 Oct), anyone could register with role "admin" and get an
-- admin profile. Proven on the local copy 22 Oct. Public sign-up is now off
-- in the dashboard; this closes the hole in the database as well.
--
-- After:
--   * from raw_user_meta_data only 'mentor' is honoured (the public "Become
--     a mentor" form); anything else becomes 'student';
--   * if a profile row already exists for the id, its role is left alone
--     (previously the trigger overwrote it).
--
-- Other roles (admin, client, and later parent) are set by our server code
-- with the service role straight after auth.admin.createUser. app_metadata
-- cannot be used here: createUser writes it in a second step, after this
-- trigger has run (checked on the local copy, GoTrue v2.193).
--
-- Deploy order: the admin "Clients" code that sets the role explicitly must
-- be live before this is applied, or new admin/client accounts would be
-- created as students.
-- ==========================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
    v_role public.user_role;
BEGIN
    IF NEW.raw_user_meta_data->>'role' = 'mentor' THEN
        v_role := 'mentor'::public.user_role;
    ELSE
        v_role := 'student'::public.user_role;
    END IF;

    INSERT INTO public.profiles (id, full_name, role, email, member_code)
    VALUES (
        NEW.id,
        NEW.raw_user_meta_data->>'full_name',
        v_role,
        NEW.email,
        NEW.raw_user_meta_data->>'member_code'
    )
    ON CONFLICT (id) DO UPDATE SET
        full_name   = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
        email       = COALESCE(EXCLUDED.email, public.profiles.email),
        member_code = COALESCE(EXCLUDED.member_code, public.profiles.member_code);

    -- Ensure a mentor row exists for mentors; do not fail if it already does.
    IF v_role = 'mentor'::public.user_role THEN
        INSERT INTO public.mentors (id, status)
        VALUES (NEW.id, 'details_required')
        ON CONFLICT (id) DO NOTHING;
    END IF;

    RETURN NEW;
END;
$function$;

-- ------------------------------------------------------------------
-- ROLLBACK (the previous definition, exactly as it was on production)
--
--    CREATE OR REPLACE FUNCTION public.handle_new_user()
--     RETURNS trigger
--     LANGUAGE plpgsql
--     SECURITY DEFINER
--    AS $function$
--    BEGIN
--      INSERT INTO public.profiles (id, full_name, role, email, member_code)
--      VALUES (
--        NEW.id,
--        NEW.raw_user_meta_data->>'full_name',
--        (COALESCE(NEW.raw_user_meta_data->>'role', 'student'))::public.user_role,
--        NEW.email,
--        NEW.raw_user_meta_data->>'member_code'
--      )
--      ON CONFLICT (id) DO UPDATE SET
--        full_name   = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
--        role        = COALESCE(EXCLUDED.role, public.profiles.role),
--        email       = COALESCE(EXCLUDED.email, public.profiles.email),
--        member_code = COALESCE(EXCLUDED.member_code, public.profiles.member_code);
--      IF (NEW.raw_user_meta_data->>'role' = 'mentor') THEN
--        INSERT INTO public.mentors (id, status)
--        VALUES (NEW.id, 'details_required')
--        ON CONFLICT (id) DO NOTHING;
--      END IF;
--      RETURN NEW;
--    END;
--    $function$;
-- ------------------------------------------------------------------
