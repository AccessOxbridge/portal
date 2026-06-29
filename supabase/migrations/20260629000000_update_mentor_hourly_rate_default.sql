-- ==========================================
-- Update default mentor hourly rate
-- Date: 2026-06-29
-- ==========================================
-- Bumps the default 60-minute mentor rate from £25.00 (2500) to £30.00 (3000).
-- Only affects mentors added after this migration; existing rows keep their value.

ALTER TABLE public.mentors
ALTER COLUMN hourly_rate_cents SET DEFAULT 3000;  -- £30/hour default
