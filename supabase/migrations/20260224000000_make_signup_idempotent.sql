-- Migration: Make signup trigger idempotent and upsert profiles/mentors
-- Created: 2026-02-24
--
-- Replaces the handle_new_user function so:
-- 1) profiles are upserted (insert or update)
-- 2) mentors insertion is safe (no duplicate-key errors)
-- 3) re-creates the auth.users trigger to ensure the updated function is used

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Upsert profile (insert or update existing profile fields)
  INSERT INTO public.profiles (id, full_name, role, email, member_code)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    (COALESCE(NEW.raw_user_meta_data->>'role', 'student'))::public.user_role,
    NEW.email,
    NEW.raw_user_meta_data->>'member_code'
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name   = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
    role        = COALESCE(EXCLUDED.role, public.profiles.role),
    email       = COALESCE(EXCLUDED.email, public.profiles.email),
    member_code = COALESCE(EXCLUDED.member_code, public.profiles.member_code);

  -- Ensure mentor row exists if role is mentor; do not fail if already exists
  IF (NEW.raw_user_meta_data->>'role' = 'mentor') THEN
    INSERT INTO public.mentors (id, status)
    VALUES (NEW.id, 'details_required')
    ON CONFLICT (id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-create the trigger on auth.users to ensure we're using the updated function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

