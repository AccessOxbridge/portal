-- ==========================================
-- Write rules, batch 1: blog, purchases, sessions, invoice numbers
-- Date: 2026-10-22
-- ==========================================
-- No rows change. Replaces four over-broad write rules found in the 22 Oct
-- audit (docs/write-rule-audit.md, findings 3, 4, 5 and 15). Reads are
-- untouched.
--
--  3. articles: any signed-in user could create or edit blog posts.
--     Now admins only. The blog admin actions already check for admin.
--  4. credit_purchases: INSERT and UPDATE were open to every role,
--     including logged-out. Now a signed-in user may only insert their own
--     pending purchase (what Stripe checkout does); updates are left to
--     the Stripe webhook, which uses the service role.
--  5. sessions: students and mentors could insert sessions directly
--     (a mentor could create a "completed" session and invoice it). No app
--     code does this with a user's client; accepting a request and admin
--     booking both use the service role. Both INSERT rules are dropped.
-- 15. next_mentor_invoice_number(): anyone could call it and burn invoice
--     numbers. Now only the service role (the invoice submit route) can.
-- ==========================================

-- ------------------------------------------------------------------
-- 3. articles: admins only
-- ------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can create articles" ON public.articles;
DROP POLICY IF EXISTS "Authenticated users can update articles" ON public.articles;

CREATE POLICY "Admins can create articles"
    ON public.articles FOR INSERT
    TO authenticated
    WITH CHECK (public.is_portal_admin());

CREATE POLICY "Admins can update articles"
    ON public.articles FOR UPDATE
    TO authenticated
    USING (public.is_portal_admin())
    WITH CHECK (public.is_portal_admin());

-- ------------------------------------------------------------------
-- 4. credit_purchases: own pending purchase only; no client updates
-- ------------------------------------------------------------------
DROP POLICY IF EXISTS "Service can insert purchases" ON public.credit_purchases;
DROP POLICY IF EXISTS "Service can update purchases" ON public.credit_purchases;

CREATE POLICY "Users can start their own purchase"
    ON public.credit_purchases FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid() AND status = 'pending');

-- ------------------------------------------------------------------
-- 5. sessions: no direct inserts from students or mentors
-- ------------------------------------------------------------------
DROP POLICY IF EXISTS "Mentors can insert sessions when accepting requests" ON public.sessions;
DROP POLICY IF EXISTS "Students can insert sessions when accepting requests" ON public.sessions;

-- ------------------------------------------------------------------
-- 15. next_mentor_invoice_number(): service role only
-- ------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.next_mentor_invoice_number() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.next_mentor_invoice_number() TO service_role;

-- ------------------------------------------------------------------
-- ROLLBACK (restores the previous rules exactly)
--
--    DROP POLICY IF EXISTS "Admins can create articles" ON public.articles;
--    DROP POLICY IF EXISTS "Admins can update articles" ON public.articles;
--    CREATE POLICY "Authenticated users can create articles" ON public.articles
--        FOR INSERT WITH CHECK (auth.role() = 'authenticated');
--    CREATE POLICY "Authenticated users can update articles" ON public.articles
--        FOR UPDATE USING (auth.role() = 'authenticated');
--
--    DROP POLICY IF EXISTS "Users can start their own purchase" ON public.credit_purchases;
--    CREATE POLICY "Service can insert purchases" ON public.credit_purchases
--        FOR INSERT WITH CHECK (true);
--    CREATE POLICY "Service can update purchases" ON public.credit_purchases
--        FOR UPDATE USING (true);
--
--    CREATE POLICY "Mentors can insert sessions when accepting requests" ON public.sessions
--        FOR INSERT WITH CHECK (auth.uid() = mentor_id);
--    CREATE POLICY "Students can insert sessions when accepting requests" ON public.sessions
--        FOR INSERT WITH CHECK (auth.uid() = student_id);
--
--    GRANT EXECUTE ON FUNCTION public.next_mentor_invoice_number() TO PUBLIC;
-- ------------------------------------------------------------------
