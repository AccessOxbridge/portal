-- Sales accounts can create parent accounts and manage parent access only.
-- No existing rows are changed. The application sets this role only after an
-- administrator creates a sales account with the service role.

ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'sales';

-- ROLLBACK
-- PostgreSQL cannot remove one enum value safely. Leave `sales` unused after
-- restoring the application if this feature is rolled back.
