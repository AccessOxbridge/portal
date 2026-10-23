-- ==========================================
-- Mentors' private fields, part A: a view for the people allowed to see them
-- Date: 2026-10-22
-- ==========================================
-- No rows change, and no existing access changes. Safe to apply before the
-- code that uses it (part B is what removes access; see the note there).
--
-- Why: "Public can view active mentors" plus full SELECT grants means anyone
-- with the public anon key can read every column of every active mentor:
-- phone, Stripe account, contract signature, CV and DBS certificate links,
-- hourly rate, application answers. Checked 22 Oct with a rolled-back
-- SET ROLE anon: 31 active mentors, phone on all 31.
--
-- public.mentors_private returns every mentors column, with the private ones
-- (everything except the public profile columns listed in part B) only for:
--   * the mentor themselves,
--   * admins (is_portal_admin) and the service role;
-- and, for a student, their own mentors' rows with only cv_url filled in
-- (the student mentor page links to the CV). Everyone else gets no row.
--
-- Same pattern as public.profiles_private (20261022091225): a
-- security_barrier view owned by postgres, so it reads the table directly
-- and its WHERE / CASE decide what each caller sees.
-- ==========================================

-- Mentors this signed-in student has a session, assignment or request with.
CREATE OR REPLACE FUNCTION private.my_mentor_ids()
RETURNS UUID[]
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT COALESCE(array_agg(DISTINCT mentor_id), '{}')
    FROM (
        SELECT mentor_id FROM public.sessions WHERE student_id = auth.uid()
        UNION SELECT mentor_id FROM public.student_mentor_assignments WHERE student_id = auth.uid()
        UNION SELECT mentor_id FROM public.mentorship_requests WHERE student_id = auth.uid()
    ) mine
    WHERE mentor_id IS NOT NULL;
$$;

REVOKE ALL ON FUNCTION private.my_mentor_ids() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.my_mentor_ids() TO authenticated, service_role;

CREATE OR REPLACE VIEW public.mentors_private
WITH (security_barrier = true)
AS
SELECT
    m.id,
    m.bio,
    m.expertise,
    m.is_active,
    m.created_at,
    m.updated_at,
    m.photo_url,
    m.status,
    m.university,
    m.timezone,
    m.q_oxbridge_college,
    m.q_specialisation,
    CASE WHEN a.full OR a.my_mentor THEN m.cv_url END AS cv_url,
    CASE WHEN a.full THEN m.embedding END AS embedding,
    CASE WHEN a.full THEN m.responses END AS responses,
    CASE WHEN a.full THEN m.hourly_rate_cents END AS hourly_rate_cents,
    CASE WHEN a.full THEN m.stripe_account_id END AS stripe_account_id,
    CASE WHEN a.full THEN m.payouts_enabled END AS payouts_enabled,
    CASE WHEN a.full THEN m.phone END AS phone,
    CASE WHEN a.full THEN m.training_completed_at END AS training_completed_at,
    CASE WHEN a.full THEN m.quiz_completed_at END AS quiz_completed_at,
    CASE WHEN a.full THEN m.quiz_answers END AS quiz_answers,
    CASE WHEN a.full THEN m.contract_signed_at END AS contract_signed_at,
    CASE WHEN a.full THEN m.contract_signature END AS contract_signature,
    CASE WHEN a.full THEN m.dbs_certificate_url END AS dbs_certificate_url,
    CASE WHEN a.full THEN m.profile_completed_at END AS profile_completed_at,
    CASE WHEN a.full THEN m.background_check_confirmed_at END AS background_check_confirmed_at,
    CASE WHEN a.full THEN m.q_alevels END AS q_alevels,
    CASE WHEN a.full THEN m.q_approach END AS q_approach,
    CASE WHEN a.full THEN m.questionnaire_completed_at END AS questionnaire_completed_at
FROM public.mentors m
CROSS JOIN LATERAL (
    SELECT
        (m.id = (SELECT auth.uid())
            OR (SELECT public.is_portal_admin())
            OR (SELECT auth.role()) = 'service_role') AS full,
        m.id = ANY ((SELECT private.my_mentor_ids())::UUID[]) AS my_mentor
) a
WHERE a.full OR a.my_mentor;

COMMENT ON VIEW public.mentors_private IS
    'Mentors'' private fields (phone, Stripe, rate, contract, DBS, CV, onboarding): all of them for the mentor, admins and the service role; cv_url only for the mentor''s own students. Read this instead of mentors for anything but public profile columns.';

REVOKE ALL ON public.mentors_private FROM PUBLIC, anon;
GRANT SELECT ON public.mentors_private TO authenticated, service_role;

-- ------------------------------------------------------------------
-- ROLLBACK (nothing reads the view until the code that uses it ships)
--
--    DROP VIEW IF EXISTS public.mentors_private;
--    DROP FUNCTION IF EXISTS private.my_mentor_ids();
-- ------------------------------------------------------------------
