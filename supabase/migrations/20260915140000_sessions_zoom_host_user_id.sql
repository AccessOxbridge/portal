-- ==================================================================
-- Zoom host pool — step 1 of 2: record which Zoom user hosts a session
--
-- Context: every meeting this codebase has ever created went to
-- POST /users/me/meetings, and `users/me` resolves to the single account
-- office@accessoxbridge.io. To run more than one session concurrently we
-- need several licensed Zoom users and a record of which one owns each
-- meeting.
--
-- BEHAVIOUR CHANGE: none. Nothing reads or writes this column yet.
--
-- APPLIED to production 2026-09-15.
-- ==================================================================

-- ------------------------------------------------------------------
-- 1. The column
--    Nullable and without a default, so this is a metadata-only change:
--    Postgres does not rewrite the table and existing rows are untouched.
--
--    NULL is meaningful, not missing data. It means "created before the
--    host pool existed", which is always office@accessoxbridge.io
--    (Zoom user id NrX3STGVRnOYckZC7N6Zbg). Step 2 relies on that, and so
--    does the allocator. Application code must set this column on every
--    row it creates from here on; NULL is for historical rows only.
-- ------------------------------------------------------------------
ALTER TABLE public.sessions
    ADD COLUMN IF NOT EXISTS zoom_host_user_id TEXT;

COMMENT ON COLUMN public.sessions.zoom_host_user_id IS
    'Zoom user id hosting this meeting. NULL = pre-host-pool row, which is '
    'always office@accessoxbridge.io (NrX3STGVRnOYckZC7N6Zbg).';

-- ------------------------------------------------------------------
-- 2. Index
--    The allocator asks "which hosts are busy in this window?", i.e.
--    filters on host and scheduled_at together.
-- ------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_sessions_zoom_host_scheduled
    ON public.sessions (zoom_host_user_id, scheduled_at)
    WHERE status <> 'cancelled';

-- ------------------------------------------------------------------
-- 3. ROLLBACK
--    Safe at any time. No row carries data here yet, and every operation
--    on an existing session is meeting-scoped (GET /meetings/{id}),
--    never host-scoped, so dropping this cannot affect a booked session.
--
--    DROP INDEX IF EXISTS public.idx_sessions_zoom_host_scheduled;
--    ALTER TABLE public.sessions DROP COLUMN IF EXISTS zoom_host_user_id;
-- ------------------------------------------------------------------
