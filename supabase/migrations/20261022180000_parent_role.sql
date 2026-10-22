-- ==========================================
-- Parent accounts, part 1: the 'parent' role value
-- Date: 2026-10-22
-- ==========================================
-- No rows change. Adds 'parent' to public.user_role. A new enum value has
-- to be committed before anything can use it, so the tables and rules
-- that use it are in the next migration (20261022180100_parent_access.sql).
--
-- Nothing in the app assigns this role yet; until an admin creates a
-- parent account, no profile has it.
-- ==========================================

ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'parent';

-- ------------------------------------------------------------------
-- ROLLBACK
--    Postgres cannot drop a single enum value. Leaving 'parent' unused is
--    harmless; the next migration's rollback removes everything that uses
--    it. (Recreating the type would need every column cast, so we don't.)
-- ------------------------------------------------------------------
