-- Login history
--
-- Records every password sign-in attempt — successful or not — so a user can
-- see activity on their own account in Settings → Security, and so an admin can
-- investigate an account that looks compromised.
--
-- Writes are deliberately service-role only. There is no INSERT policy below,
-- which is not an oversight: a FAILED sign-in has no session at all, so the
-- caller is `anon` and any user-scoped INSERT policy would silently drop
-- exactly the rows that matter most. `lib/login-events.ts` writes with the
-- admin client instead.

CREATE TABLE IF NOT EXISTS public.login_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Null when someone tries to sign in as an address that has no account.
    -- Those rows are kept for admins (repeated hits are how credential
    -- stuffing shows up) and are never shown in a user-facing list.
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Stored lowercased. Kept alongside user_id so a failed attempt against an
    -- unknown address is still legible, and so the row survives as an audit
    -- record of what was tried.
    email TEXT,

    -- TEXT rather than INET: behind a proxy this is whatever the forwarding
    -- header gave us, and a malformed value must not cost us the log line.
    ip TEXT,
    user_agent TEXT,

    status TEXT NOT NULL CHECK (status IN ('success', 'failed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- The two reads this table has: one user's history, and the global admin feed.
CREATE INDEX IF NOT EXISTS login_events_user_id_created_at_idx
    ON public.login_events (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS login_events_created_at_idx
    ON public.login_events (created_at DESC);

ALTER TABLE public.login_events ENABLE ROW LEVEL SECURITY;

-- Users see their own sign-ins, and only rows already tied to their account —
-- an attempt against an unknown address stays admin-only.
DROP POLICY IF EXISTS "Users can view their own login events" ON public.login_events;
CREATE POLICY "Users can view their own login events"
    ON public.login_events FOR SELECT TO authenticated
    USING (user_id = auth.uid());

-- Admins see everything. Matches the role test used by every other admin
-- policy in this schema.
DROP POLICY IF EXISTS "Admins can view all login events" ON public.login_events;
CREATE POLICY "Admins can view all login events"
    ON public.login_events FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role IN ('admin', 'admin-dev')
        )
    );

-- Retention. UK GDPR asks that security logs be kept no longer than necessary,
-- so 90 days is the ceiling rather than "forever". Called opportunistically
-- from the write path; it is indexed and bounded, so it costs nothing per login.
CREATE OR REPLACE FUNCTION public.prune_login_events()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    DELETE FROM public.login_events
    WHERE created_at < NOW() - INTERVAL '90 days';
$$;

REVOKE ALL ON FUNCTION public.prune_login_events() FROM PUBLIC, anon, authenticated;

-- Rollback:
--   DROP FUNCTION IF EXISTS public.prune_login_events();
--   DROP TABLE IF EXISTS public.login_events;
