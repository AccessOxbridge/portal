-- ==========================================
-- Allow issue_type = 'student_help' on user_issues
-- Date: 2026-09-02
-- ==========================================
-- /api/student/help has always inserted issue_type 'student_help' (and
-- /dashboard/admin/student-help filters on it), but the original CHECK
-- constraint never allowed that value, so every Help & Support submission
-- failed with 23514 and the admin page has always been empty.
--
-- This only WIDENS the allowed set, so no existing row can violate it.

ALTER TABLE public.user_issues
    DROP CONSTRAINT IF EXISTS user_issues_issue_type_check;

ALTER TABLE public.user_issues
    ADD CONSTRAINT user_issues_issue_type_check
    CHECK (issue_type IN ('payment', 'session', 'technical', 'other', 'student_help'));

-- ==========================================
-- ROLLBACK
-- ==========================================
-- Note: only safe while no 'student_help' rows exist; delete or re-type them first.
--
-- ALTER TABLE public.user_issues
--     DROP CONSTRAINT IF EXISTS user_issues_issue_type_check;
--
-- ALTER TABLE public.user_issues
--     ADD CONSTRAINT user_issues_issue_type_check
--     CHECK (issue_type IN ('payment', 'session', 'technical', 'other'));
