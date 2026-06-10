-- Ensure every mentor-role profile has a matching mentors row.
--
-- Context: accounts are now created internally (Supabase dashboard / SQL / import),
-- not via public signup. The handle_new_user() trigger only inserts a mentors row
-- when role='mentor' is present in the auth metadata AT sign-up time. Accounts that
-- are created without that metadata, or promoted to mentor afterwards, never get a
-- mentors row -- which left them unable to submit onboarding, because submitOnboarding
-- does an UPDATE (RLS has no mentor self-INSERT policy) and it matched zero rows:
-- "Your mentor profile is not initialized yet."

-- 1. Backfill: create the missing mentors rows for existing mentor profiles.
INSERT INTO public.mentors (id, status)
SELECT p.id, 'details_required'
FROM public.profiles p
LEFT JOIN public.mentors m ON m.id = p.id
WHERE p.role = 'mentor' AND m.id IS NULL;

-- 2. Going forward: guarantee a mentors row whenever a profile is created as,
--    or promoted to, the mentor role. SECURITY DEFINER so it bypasses RLS.
CREATE OR REPLACE FUNCTION public.ensure_mentor_row()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role = 'mentor' THEN
    INSERT INTO public.mentors (id, status)
    VALUES (NEW.id, 'details_required')
    ON CONFLICT (id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_profile_role_mentor ON public.profiles;
CREATE TRIGGER on_profile_role_mentor
  AFTER INSERT OR UPDATE OF role ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.ensure_mentor_row();
