-- ==========================================
-- Payout uniqueness guards (audit F1 + F4)
-- Date: 2026-06-29
-- ==========================================
-- Prevents double-paying mentors:
--   1. One payout row per mentor per period — backs the onConflict upsert in
--      POST /api/admin/payouts so concurrent/retried requests reuse the same
--      payout id (which is also the Stripe transfer idempotency key).
--   2. A session can belong to at most one payout item — a session is paid once.
--
-- Uses CREATE UNIQUE INDEX IF NOT EXISTS so the migration is idempotent and
-- doubles as the conflict target PostgREST needs for upserts.
--
-- NOTE: if any duplicate rows already exist these statements will error; clean
-- those up first. This is expected to run before any live payouts.

CREATE UNIQUE INDEX IF NOT EXISTS uq_mentor_payouts_period
    ON public.mentor_payouts (mentor_id, period_start, period_end);

CREATE UNIQUE INDEX IF NOT EXISTS uq_mentor_payout_items_session
    ON public.mentor_payout_items (session_id);
