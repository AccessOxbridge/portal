-- ==========================================
-- Parent: student information and documents
-- Date: 2026-10-27
-- ==========================================
-- ADDITIVE ONLY. Two new tables, one new private bucket. No existing row,
-- table, policy or bucket is read, changed or removed.
--
-- A parent (usually a prospect, before the student account exists) tells us
-- about their child and uploads documents for the academic team: school
-- reports, predicted grades, a personal statement draft and so on.
--
-- Who can do what:
--   * Parents read their own rows. Admins read every row.
--   * Nobody writes through the API: the parent's form and uploads go
--     through /api/parent/student-info and /api/parent/documents, which
--     check the caller is a parent and then write with the service role
--     (the same pattern as parent_profiles and request-hours).
--   * The bucket is private with NO storage policies for signed-in users.
--     Files go up through a one-off signed upload URL the server issues for
--     a path under the parent's own folder, and come down through
--     short-lived signed URLs the server issues after checking the caller
--     owns the file or is an admin.
--
-- Rollback is section 4 at the bottom of this file.
-- ==========================================

-- ------------------------------------------------------------------
-- 1. Student information (one row per parent)
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.parent_student_info (
    parent_id             UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    child_first_name      TEXT NOT NULL CHECK (char_length(child_first_name) BETWEEN 1 AND 60),
    child_last_name       TEXT CHECK (child_last_name IS NULL OR char_length(child_last_name) <= 60),
    school                TEXT CHECK (school IS NULL OR char_length(school) <= 120),
    year_group            TEXT CHECK (year_group IS NULL OR char_length(year_group) <= 40),
    subjects              TEXT CHECK (subjects IS NULL OR char_length(subjects) <= 300),
    course_interest       TEXT CHECK (course_interest IS NULL OR char_length(course_interest) <= 120),
    university_preference TEXT CHECK (university_preference IS NULL OR university_preference IN ('oxford', 'cambridge', 'undecided')),
    notes                 TEXT CHECK (notes IS NULL OR char_length(notes) <= 2000),
    submitted_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.parent_student_info IS
    'What a parent tells us about their child before or during enrolment. Written by the server only (service role).';

ALTER TABLE public.parent_student_info ENABLE ROW LEVEL SECURITY;
-- Supabase's default privileges give new tables ALL to anon and authenticated;
-- take them back so signed-in users can only read (RLS then limits which rows).
REVOKE ALL ON public.parent_student_info FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.parent_student_info TO authenticated;
GRANT ALL ON public.parent_student_info TO service_role;

CREATE POLICY "Parents see their own student info"
    ON public.parent_student_info FOR SELECT TO authenticated
    USING (parent_id = (SELECT auth.uid()) OR (SELECT public.is_portal_admin()));

-- ------------------------------------------------------------------
-- 2. Documents (one row per uploaded file)
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.parent_documents (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    storage_path  TEXT NOT NULL UNIQUE CHECK (char_length(storage_path) <= 300),
    file_name     TEXT NOT NULL CHECK (char_length(file_name) BETWEEN 1 AND 200),
    mime_type     TEXT NOT NULL CHECK (char_length(mime_type) <= 120),
    size_bytes    INTEGER NOT NULL CHECK (size_bytes > 0 AND size_bytes <= 10485760),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.parent_documents IS
    'Files a parent uploaded for the academic team. storage_path is inside the private parent-documents bucket, under <parent_id>/. Written by the server only.';

CREATE INDEX IF NOT EXISTS parent_documents_parent_id_idx
    ON public.parent_documents (parent_id, created_at DESC);

ALTER TABLE public.parent_documents ENABLE ROW LEVEL SECURITY;
-- Supabase's default privileges give new tables ALL to anon and authenticated;
-- take them back so signed-in users can only read (RLS then limits which rows).
REVOKE ALL ON public.parent_documents FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.parent_documents TO authenticated;
GRANT ALL ON public.parent_documents TO service_role;

CREATE POLICY "Parents see their own documents"
    ON public.parent_documents FOR SELECT TO authenticated
    USING (parent_id = (SELECT auth.uid()) OR (SELECT public.is_portal_admin()));

-- ------------------------------------------------------------------
-- 3. Private bucket `parent-documents`
--    10 MB per file; PDFs, Word documents and photos/scans only. No
--    storage.objects policies on purpose: with RLS on and no policy, a
--    signed-in user can neither list, read nor write here directly.
-- ------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'parent-documents',
    'parent-documents',
    false,
    10485760,
    ARRAY[
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'image/jpeg', 'image/png', 'image/heic', 'image/webp'
    ]
)
ON CONFLICT (id) DO NOTHING;

-- ------------------------------------------------------------------
-- 4. Rollback (run by hand, in this order, only if nothing depends on it):
--    Removing the bucket first needs its objects gone; check with
--      SELECT count(*) FROM storage.objects WHERE bucket_id = 'parent-documents';
--    and remove them through the Storage API, not SQL.
--
--    DELETE FROM storage.buckets WHERE id = 'parent-documents';
--    DROP TABLE IF EXISTS public.parent_documents;
--    DROP TABLE IF EXISTS public.parent_student_info;
-- ------------------------------------------------------------------
