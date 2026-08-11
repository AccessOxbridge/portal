-- ==========================================
-- Harden the chat attachment folder check
-- Date: 2026-08-11
-- ==========================================
-- Supersedes the SECURITY DEFINER definition in 20260811064603.
--
-- Why: as DEFINER the function was exposed at
-- /rest/v1/rpc/can_access_conversation_folder to both `anon` and
-- `authenticated` (database linter 0028 / 0029). It never needed elevated
-- rights — public.conversations already carries RLS making a row visible to
-- exactly its participants plus admins, so an INVOKER function reaches the
-- same answer through the caller's own permissions.
--
-- The explicit participant predicates are dropped for the same reason: RLS on
-- conversations already applies them, and duplicating the rule in two places
-- means it can drift.
--
-- Data-safe: replaces one function definition. No rows are read or written.
-- The two storage.objects policies from 20260811064603 keep working unchanged
-- because the function keeps its name and signature.
-- ==========================================

CREATE OR REPLACE FUNCTION public.can_access_conversation_folder(object_name TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY INVOKER
SET search_path = public
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.conversations c
        WHERE c.id::text = (storage.foldername(object_name))[1]
    );
$$;

COMMENT ON FUNCTION public.can_access_conversation_folder(TEXT) IS
    'True when the first path segment names a conversation the caller can see. Relies on RLS over public.conversations; do not make this SECURITY DEFINER.';

-- ------------------------------------------------------------------
-- ROLLBACK: restore the DEFINER version from 20260811064603. Not advised —
-- it re-opens the RPC surface the linter flags.
-- ------------------------------------------------------------------
