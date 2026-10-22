-- ==========================================
-- Profiles private fields, part B: stop direct reads of the four columns
-- Date: 2026-10-21 (applied to production 2026-10-22)
-- ==========================================
-- No rows change. Apply ONLY after app code that reads email, credits,
-- stripe_customer_id and member_code from public.profiles_private (or the
-- service-role client) is deployed. Applying it before that sends every
-- signed-in user to the error page (verified locally 21 Oct).
--
-- public.profiles keeps id, full_name, role, photo_url and updated_at for
-- anyone allowed to see the row. The four private columns are readable
-- only through public.profiles_private (part A) or the service role.
-- INSERT/UPDATE privileges are untouched; other tables' policies only read
-- profiles.id and profiles.role.
-- ==========================================

REVOKE SELECT ON public.profiles FROM anon, authenticated;
GRANT SELECT (id, full_name, role, photo_url, updated_at) ON public.profiles TO anon, authenticated;

-- ------------------------------------------------------------------
-- ROLLBACK (instant, safe at any time; restores full column reads)
--
--    GRANT SELECT ON public.profiles TO anon, authenticated;
-- ------------------------------------------------------------------
