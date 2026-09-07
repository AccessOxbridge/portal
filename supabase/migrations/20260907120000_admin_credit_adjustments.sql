-- ==========================================
-- Admin credit adjustments: hardened ledger + atomic RPC
-- Date: 2026-09-07
-- ==========================================
-- ADDITIVE ONLY. This migration never reads, rewrites, or deletes an existing
-- row. It adds two nullable columns, one index, one policy and one function,
-- and drops exactly one policy whose definition is reproduced verbatim in the
-- rollback block at the bottom.
--
-- Why:
--   1. There is no product surface for topping up an existing student's hours.
--      The documented procedure (FOUNDERS_HANDBOOK.md:789-793) is to hand-edit
--      profiles.credits in the Supabase dashboard — slow, unlogged, and the
--      riskiest possible way to touch a money column.
--   2. credit_transactions' INSERT policy is `WITH CHECK (true)`, so ANY
--      authenticated user can forge ledger rows. The ledger is meant to be the
--      audit trail; as it stands it cannot be trusted as one.
--
-- What still works after this:
--   - Stripe purchase top-up       (app/api/webhooks/stripe/route.ts)
--   - Zoom meeting.ended deduct    (app/api/webhooks/zoom/route.ts:26)
--   - Create Account initial hours (app/dashboard/admin/create-account/actions.ts)
--     All three use createAdminClient() (service_role), and service_role
--     BYPASSES RLS entirely, so removing the permissive INSERT policy below
--     does not affect any of them.
--   - "Users can view own transactions" — untouched.
--   - protect_profiles_role() and is_privileged_profile_actor() — NOT modified,
--     so the existing profiles column protections cannot regress.
-- ==========================================

-- ------------------------------------------------------------------
-- 1. Provenance on the ledger
--    Nullable: the three existing writers never set them, and their
--    historical rows stay exactly as they are.
--
--    admin_id is ON DELETE SET NULL, deliberately unlike user_id's CASCADE.
--    Two reasons: a departing admin must not erase a student's balance
--    history, and the default (NO ACTION) would make deleting an admin who
--    has ever adjusted credits FAIL — which would break
--    admin.auth.admin.deleteUser() at create-account/actions.ts:135,:244
--    and become-a-mentor/actions.ts:111.
--
--    ip is TEXT not INET: behind Vercel this is whatever the forwarding
--    header gave us, and a malformed value must not cost us the audit row.
--    Same reasoning as public.login_events.ip.
-- ------------------------------------------------------------------
ALTER TABLE public.credit_transactions
    ADD COLUMN IF NOT EXISTS admin_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS ip TEXT;

COMMENT ON COLUMN public.credit_transactions.admin_id IS
    'Admin who made this adjustment. Only set for type = admin_adjustment rows written by admin_adjust_credits().';
COMMENT ON COLUMN public.credit_transactions.ip IS
    'Client IP of the adjusting admin, best-effort from x-forwarded-for.';

-- ------------------------------------------------------------------
-- 2. Close the ledger forgery hole
--    WITH CHECK (true) let any authenticated user INSERT arbitrary rows.
--    After this drop there is NO insert policy, so under RLS nobody can
--    write the ledger; only service_role (which bypasses RLS) and the
--    SECURITY DEFINER function below can.
-- ------------------------------------------------------------------
DROP POLICY IF EXISTS "Service can insert transactions" ON public.credit_transactions;

-- Belt and braces. `authenticated` currently holds arwdDxtm on this table
-- (verified in pg_class.relacl), so RLS policies are the ONLY thing standing
-- between a signed-in user and an INSERT. Taking the grants away means a
-- permissive policy added by mistake in future still cannot open a write path.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.credit_transactions FROM anon, authenticated;

-- No UPDATE or DELETE policy is created for this table, by design: under RLS
-- the ledger is append-only and rows can never be edited or removed.

-- ------------------------------------------------------------------
-- 3. Admins can read every student's ledger (powers the history panel)
-- ------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins can view all credit transactions" ON public.credit_transactions;
CREATE POLICY "Admins can view all credit transactions"
    ON public.credit_transactions FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
              AND p.role IN ('admin'::public.user_role, 'admin-dev'::public.user_role)
        )
    );

CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_created
    ON public.credit_transactions (user_id, created_at DESC);

-- ------------------------------------------------------------------
-- 3b. Immutability — BEFORE UPDATE ONLY, deliberately NOT delete.
--
--     An audit trail that can be rewritten in place is not an audit trail.
--     This blocks edits for EVERY role including service_role, so a bug or a
--     leaked key cannot quietly restate history; corrections are made by
--     writing a compensating row, which is what the ledger is for.
--
--     DELETE is deliberately left alone. Blocking it would break the
--     auth.users -> profiles -> credit_transactions ON DELETE CASCADE, and
--     therefore admin.auth.admin.deleteUser() at
--     create-account/actions.ts:135 and :244 and
--     become-a-mentor/actions.ts:111 for any user with ledger rows. That
--     rollback path must keep working.
--
--     Escape hatch for a genuine, human-approved correction:
--       ALTER TABLE public.credit_transactions DISABLE TRIGGER credit_transactions_immutable;
-- ------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.credit_transactions_immutable()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
    RAISE EXCEPTION 'credit_transactions rows are immutable; write a compensating row instead';
END;
$$;

DROP TRIGGER IF EXISTS credit_transactions_immutable ON public.credit_transactions;
CREATE TRIGGER credit_transactions_immutable
    BEFORE UPDATE ON public.credit_transactions
    FOR EACH ROW EXECUTE FUNCTION public.credit_transactions_immutable();

REVOKE ALL ON FUNCTION public.credit_transactions_immutable() FROM PUBLIC;

-- ------------------------------------------------------------------
-- 4. The atomic adjustment
--
--    SECURITY DEFINER, owned by postgres. Two consequences, both wanted:
--
--    a) Inside the function current_user is postgres, which satisfies
--       is_privileged_profile_actor() through its `current_user IN (...)`
--       branch. That is what lets the protect_profiles_role trigger accept
--       the credits UPDATE — WITHOUT this migration having to touch that
--       trigger or that helper at all.
--
--    b) EXECUTE is granted to service_role ONLY, never to authenticated.
--       This is the crux of the whole design. If a browser session could
--       call this RPC with the anon key, an admin would bypass the
--       ADMIN_CREDIT_GRANTERS env allowlist enforced in the route and the
--       allowlist would be decorative. Restricting EXECUTE to service_role
--       forces every grant through app/api/admin/credits/adjust.
--
--    p_admin_id is passed explicitly rather than read from auth.uid(): calls
--    arrive over the service_role key, whose JWT carries no `sub`, so
--    auth.uid() is NULL here. The route derives p_admin_id from the
--    authenticated session and never from the request body.
-- ------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_adjust_credits(
    p_admin_id   UUID,
    p_student_id UUID,
    p_delta      INTEGER,
    p_reason     TEXT,
    p_ip         TEXT DEFAULT NULL
)
RETURNS TABLE (
    balance_before INTEGER,
    balance_after  INTEGER,
    transaction_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_reason       TEXT := btrim(COALESCE(p_reason, ''));
    v_admin_role   public.user_role;
    v_student_role public.user_role;
    v_before       INTEGER;
    v_after        INTEGER;
    v_tx_id        UUID;
BEGIN
    -- The caller must actually hold the service key (or be a superuser in the
    -- SQL editor). SECURITY DEFINER rewrites current_user to the owner, so
    -- current_user is useless as an identity check here — but session_user is
    -- NOT rewritten ('authenticator' under PostgREST), and auth.role() reads
    -- the JWT claim. Both survive the definer switch, so this assertion still
    -- means something even though the function runs as postgres.
    IF COALESCE(auth.role(), '') <> 'service_role'
       AND session_user NOT IN ('postgres', 'supabase_admin') THEN
        RAISE EXCEPTION 'admin_adjust_credits: caller is not the service role'
            USING ERRCODE = '42501';
    END IF;

    IF p_admin_id IS NULL OR p_student_id IS NULL THEN
        RAISE EXCEPTION 'admin_adjust_credits: admin and student are both required'
            USING ERRCODE = '22023';
    END IF;

    -- Defence in depth. The route already checked role + allowlist; this
    -- re-checks the role at the point the write actually happens.
    SELECT role INTO v_admin_role FROM public.profiles WHERE id = p_admin_id;
    IF v_admin_role IS NULL OR v_admin_role NOT IN ('admin'::public.user_role, 'admin-dev'::public.user_role) THEN
        RAISE EXCEPTION 'admin_adjust_credits: caller is not an admin'
            USING ERRCODE = '42501';
    END IF;

    IF p_delta IS NULL OR p_delta = 0 THEN
        RAISE EXCEPTION 'admin_adjust_credits: delta must be a non-zero integer'
            USING ERRCODE = '22023';
    END IF;

    -- A hijacked admin session cannot mint an unbounded balance in one call.
    IF abs(p_delta) > 100 THEN
        RAISE EXCEPTION 'admin_adjust_credits: delta must be between -100 and 100'
            USING ERRCODE = '22023';
    END IF;

    IF length(v_reason) < 3 OR length(v_reason) > 500 THEN
        RAISE EXCEPTION 'admin_adjust_credits: reason must be 3-500 characters'
            USING ERRCODE = '22023';
    END IF;

    -- Lock the row: two concurrent adjustments serialise here rather than
    -- silently losing one of the two updates.
    SELECT role, COALESCE(credits, 0)
      INTO v_student_role, v_before
      FROM public.profiles
     WHERE id = p_student_id
     FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'admin_adjust_credits: student not found'
            USING ERRCODE = 'P0002';
    END IF;

    IF v_student_role IS DISTINCT FROM 'student'::public.user_role THEN
        RAISE EXCEPTION 'admin_adjust_credits: target is not a student'
            USING ERRCODE = '22023';
    END IF;

    v_after := GREATEST(0, v_before + p_delta);

    UPDATE public.profiles SET credits = v_after WHERE id = p_student_id;

    -- amount records the EFFECTIVE delta (after the floor at zero), not the
    -- requested one, so SUM(amount) stays reconcilable against balance_after.
    -- The requested value is preserved in the description when they differ.
    INSERT INTO public.credit_transactions
        (user_id, amount, balance_after, type, description, admin_id, ip)
    VALUES (
        p_student_id,
        v_after - v_before,
        v_after,
        'admin_adjustment',
        CASE
            WHEN v_after - v_before <> p_delta
                THEN v_reason || ' [requested ' || p_delta || ', floored at 0]'
            ELSE v_reason
        END,
        p_admin_id,
        p_ip
    )
    RETURNING id INTO v_tx_id;

    RETURN QUERY SELECT v_before, v_after, v_tx_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_adjust_credits(UUID, UUID, INTEGER, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_adjust_credits(UUID, UUID, INTEGER, TEXT, TEXT) FROM anon;
REVOKE ALL ON FUNCTION public.admin_adjust_credits(UUID, UUID, INTEGER, TEXT, TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.admin_adjust_credits(UUID, UUID, INTEGER, TEXT, TEXT) TO service_role;

-- ------------------------------------------------------------------
-- Rollback (do not run unless reverting this migration):
--   DROP FUNCTION IF EXISTS public.admin_adjust_credits(UUID, UUID, INTEGER, TEXT, TEXT);
--   DROP TRIGGER IF EXISTS credit_transactions_immutable ON public.credit_transactions;
--   DROP FUNCTION IF EXISTS public.credit_transactions_immutable();
--   DROP POLICY IF EXISTS "Admins can view all credit transactions" ON public.credit_transactions;
--   DROP INDEX IF EXISTS public.idx_credit_transactions_user_created;
--   GRANT INSERT, UPDATE, DELETE, TRUNCATE ON public.credit_transactions TO anon, authenticated;
--   CREATE POLICY "Service can insert transactions"
--       ON public.credit_transactions FOR INSERT
--       WITH CHECK (true);
--   ALTER TABLE public.credit_transactions
--       DROP COLUMN IF EXISTS admin_id,
--       DROP COLUMN IF EXISTS ip;
-- ------------------------------------------------------------------
