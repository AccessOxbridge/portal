-- ==========================================
-- Real meeting length per session
-- Date: 2026-10-19
-- ==========================================
-- ADDITIVE ONLY. Two nullable columns, no defaults, no backfill.
--
-- The Zoom webhook records each meeting instance it is told about (keyed by
-- the instance uuid) and the total real minutes across them. A session under
-- 15 real minutes does not charge the student and cannot be invoiced.
--
-- Every existing row stays NULL, which all code treats as "length unknown,
-- behave exactly as before" (charged and billable).
-- ==========================================

ALTER TABLE public.sessions
    ADD COLUMN IF NOT EXISTS zoom_instances JSONB,
    ADD COLUMN IF NOT EXISTS actual_minutes INTEGER;

COMMENT ON COLUMN public.sessions.zoom_instances IS
    'Zoom meeting instances seen on meeting.ended, keyed by instance uuid: {start, end, minutes, counted_minutes}. A repeated webhook for the same uuid is ignored.';
COMMENT ON COLUMN public.sessions.actual_minutes IS
    'Real meeting minutes summed across counted instances. NULL = unknown (all rows predating this column). Under 15 = not charged, not invoiceable.';

-- ---------- ROLLBACK ----------
-- ALTER TABLE public.sessions
--     DROP COLUMN IF EXISTS zoom_instances,
--     DROP COLUMN IF EXISTS actual_minutes;
