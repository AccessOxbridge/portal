-- ==========================================
-- sessions.payout_amount_cents
-- Date: 2026-08-19
-- ==========================================
-- ADDITIVE ONLY. Nullable INTEGER, no default — metadata-only change in
-- Postgres; existing session rows stay NULL and keep computing payout as
-- (duration_minutes / 60) * mentors.hourly_rate_cents.
--
-- When set, this is a flat one-off payout override in pence for that session
-- only (e.g. 7000 = £70). Invoice create snapshots amount_cents from
-- sessionAmountCents(..., payout_amount_cents).
--
-- Rollback is section at the bottom of this file.
-- ==========================================

ALTER TABLE public.sessions
    ADD COLUMN IF NOT EXISTS payout_amount_cents INTEGER;

COMMENT ON COLUMN public.sessions.payout_amount_cents IS
    'Optional flat payout override in pence. NULL = (duration/60)*mentor hourly rate.';

-- ------------------------------------------------------------------
-- ROLLBACK
--   ALTER TABLE public.sessions DROP COLUMN IF EXISTS payout_amount_cents;
-- ------------------------------------------------------------------
