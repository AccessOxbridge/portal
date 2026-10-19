-- Profiles: signed-in users only.
--
-- profiles holds email, credits, stripe_customer_id and member_code. The old
-- SELECT policy ("Public profiles are viewable by everyone.", USING true)
-- applied to every role, so anyone holding the public anon key, which ships
-- in the browser bundle, could read every row while logged out.
--
-- This restricts that policy to the authenticated role. Nothing else changes:
--   * signed-in users still read profiles exactly as before (narrowing what
--     they can see is a separate, later change);
--   * server code that runs logged out (sign-up, login tracking,
--     become-a-mentor) uses the service role, which bypasses RLS;
--   * mentors_directory (read by the CRM with the anon key) is owned by
--     postgres, which bypasses RLS, so it is unaffected;
--   * the admin-only policies on other tables that look up profiles already
--     evaluate to false for anon (auth.uid() is null).
--
-- No rows change. Rollback:
--   alter policy "Signed-in users can view profiles" on public.profiles to public;
--   alter policy "Signed-in users can view profiles" on public.profiles
--       rename to "Public profiles are viewable by everyone.";

alter policy "Public profiles are viewable by everyone." on public.profiles to authenticated;

alter policy "Public profiles are viewable by everyone." on public.profiles
    rename to "Signed-in users can view profiles";
