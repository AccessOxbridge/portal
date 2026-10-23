-- ==========================================
-- Mentors' private fields, part B: only public profile columns on the table
-- Date: 2026-10-22
-- ==========================================
-- No rows change. Apply only AFTER the code that reads private fields from
-- public.mentors_private (part A) is live: from this point a signed-in or
-- signed-out caller selecting a private column, or `*`, from public.mentors
-- gets "permission denied". The service role is unaffected.
--
-- 1. public.mentors: anon and authenticated may read only the public
--    profile columns. Rows are still decided by the existing RLS rules
--    (active mentors for everyone, own row, admins), and writes are
--    unchanged.
-- 2. storage mentor-assets: "Public Access" let anyone LIST every file in
--    the bucket (CVs, DBS certificates, photos). Replaced with: a signed-in
--    user reads their own folder, admins read everything. Files stay
--    downloadable by their public link (the bucket is still public), so
--    photos keep working; moving CVs and DBS certificates to a private
--    bucket is a separate change.
-- ==========================================

-- ------------------------------------------------------------------
-- 1. Column-level read access on public.mentors
-- ------------------------------------------------------------------
REVOKE SELECT ON public.mentors FROM anon, authenticated;
GRANT SELECT (
    id,
    bio,
    expertise,
    is_active,
    created_at,
    updated_at,
    photo_url,
    status,
    university,
    timezone,
    q_oxbridge_college,
    q_specialisation
) ON public.mentors TO anon, authenticated;

-- ------------------------------------------------------------------
-- 2. mentor-assets: no more public listing
-- ------------------------------------------------------------------
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Mentor assets: own folder or admin" ON storage.objects;

CREATE POLICY "Mentor assets: own folder or admin"
    ON storage.objects FOR SELECT TO authenticated
    USING (
        bucket_id = 'mentor-assets'
        AND ((storage.foldername(name))[1] = (SELECT auth.uid())::text OR (SELECT public.is_portal_admin()))
    );

-- ------------------------------------------------------------------
-- ROLLBACK (restores the previous access exactly)
--
--    GRANT SELECT ON public.mentors TO anon, authenticated;
--    DROP POLICY IF EXISTS "Mentor assets: own folder or admin" ON storage.objects;
--    CREATE POLICY "Public Access" ON storage.objects FOR SELECT TO public
--        USING (bucket_id = 'mentor-assets'::text);
-- ------------------------------------------------------------------
