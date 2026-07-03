-- ==========================================
-- Mentor Invoicing (invoice-driven payouts)
-- Date: 2026-07-02
-- ==========================================
-- Implements the data model from INVOICE_FEATURE_SPEC.md §4 & §7 (Option A,
-- mentor-issued, invoice-driven payouts):
--   * mentor_invoices / mentor_invoice_items / mentor_invoice_documents
--   * sessions.invoice_id       — single source of truth for "session invoiced?"
--   * mentor_payouts.invoice_id — one payout <-> one invoice
--   * switch payout uniqueness from (mentor, period) to (invoice_id)
--   * continuous invoice-number sequence + AO-INV-YYYY-NNNNNN formatter
--   * RLS (mentor reads own; admin/admin-dev manage all) + private `invoices` bucket
--
-- Schema-only. No application code changes in this migration.
-- Idempotent guards (IF NOT EXISTS / DROP ... IF EXISTS) throughout so it can be
-- re-run safely.

-- ------------------------------------------------------------------
-- 1. mentor_invoices  (spec §4)
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.mentor_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mentor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    invoice_number TEXT UNIQUE,                  -- AO-INV-YYYY-NNNNNN, assigned on submit (§4.1)
    invoice_reference TEXT,                      -- human tag: "{mentor name} - {invoice date}"
    invoice_date DATE,                           -- date the invoice is generated/submitted
    period_start DATE,                           -- derived = min session date (display only)
    period_end DATE,                             -- derived = max session date (display only)
    status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'submitted', 'paid', 'void')),
    subtotal_cents INTEGER NOT NULL DEFAULT 0,   -- gross pay = sum of item amounts
    withholding_cents INTEGER NOT NULL DEFAULT 0,-- admin-editable, subtracted
    vat_cents INTEGER NOT NULL DEFAULT 0,        -- non-zero only if mentor VAT-registered
    total_cents INTEGER NOT NULL DEFAULT 0,      -- subtotal - withholding + vat
    currency TEXT NOT NULL DEFAULT 'gbp',
    is_self_billed BOOLEAN NOT NULL DEFAULT false, -- false for Option A; true for future Option B
    payout_id UUID REFERENCES public.mentor_payouts(id) ON DELETE SET NULL, -- set when paid
    submitted_at TIMESTAMPTZ,                    -- "Sent to Finance" time
    paid_at TIMESTAMPTZ,
    voided_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- updated_at trigger (reuses the shared update_updated_at_column() function)
DROP TRIGGER IF EXISTS update_mentor_invoices_updated_at ON public.mentor_invoices;
CREATE TRIGGER update_mentor_invoices_updated_at
    BEFORE UPDATE ON public.mentor_invoices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ------------------------------------------------------------------
-- 2. mentor_invoice_items  (spec §4)
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.mentor_invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES public.mentor_invoices(id) ON DELETE CASCADE,
    session_id UUID REFERENCES public.sessions(id) ON DELETE SET NULL,
    description TEXT NOT NULL DEFAULT '1-1 Mentorship Session', -- fixed service description
    student_name TEXT,                           -- snapshot of student name at invoice time
    session_date DATE,                           -- from sessions.scheduled_at
    duration_minutes INTEGER NOT NULL,           -- booked duration
    hourly_rate_cents INTEGER NOT NULL,          -- snapshot of rate at invoice time
    amount_cents INTEGER NOT NULL                -- (duration_minutes / 60) * hourly_rate_cents
);

-- ------------------------------------------------------------------
-- 3. mentor_invoice_documents  (spec §6 — invoice + remittance PDFs)
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.mentor_invoice_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES public.mentor_invoices(id) ON DELETE CASCADE,
    kind TEXT NOT NULL CHECK (kind IN ('invoice', 'remittance')),
    pdf_path TEXT NOT NULL,                       -- path within the private `invoices` bucket
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------
-- 4. sessions.invoice_id  (spec §4.3 — anti-double-billing source of truth)
--    ON DELETE SET NULL: if an invoice row is ever hard-deleted, its sessions
--    return to the unbilled pool (the normal path is an app-level void that
--    clears this to NULL).
-- ------------------------------------------------------------------
ALTER TABLE public.sessions
    ADD COLUMN IF NOT EXISTS invoice_id UUID REFERENCES public.mentor_invoices(id) ON DELETE SET NULL;

-- ------------------------------------------------------------------
-- 5. mentor_payouts.invoice_id  (spec §7 — one payout <-> one invoice)
-- ------------------------------------------------------------------
ALTER TABLE public.mentor_payouts
    ADD COLUMN IF NOT EXISTS invoice_id UUID REFERENCES public.mentor_invoices(id) ON DELETE SET NULL;

-- ------------------------------------------------------------------
-- 6. Payout uniqueness switch (spec §7)
--    Replace one-payout-per-(mentor, period) with one-payout-per-invoice.
--    Partial index (WHERE invoice_id IS NOT NULL) so legacy rows with a NULL
--    invoice_id are unconstrained while every non-null invoice_id is unique.
--    NOTE: the payout route does a manual get-or-create keyed on invoice_id
--    rather than an ON CONFLICT upsert — a partial index can't be used as a
--    PostgREST `on_conflict` target. uq_mentor_payout_items_session is kept.
-- ------------------------------------------------------------------
DROP INDEX IF EXISTS public.uq_mentor_payouts_period;
CREATE UNIQUE INDEX IF NOT EXISTS uq_mentor_payouts_invoice
    ON public.mentor_payouts (invoice_id)
    WHERE invoice_id IS NOT NULL;

-- ------------------------------------------------------------------
-- 7. Invoice numbering (spec §4.1)
--    A single continuous sequence => gapless, never-reused counter. The year in
--    the formatted number is display only (current year); the counter does not
--    reset per year.
-- ------------------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS public.mentor_invoice_seq;

CREATE OR REPLACE FUNCTION public.next_mentor_invoice_number()
RETURNS TEXT
LANGUAGE sql
VOLATILE
AS $$
    SELECT 'AO-INV-' || to_char(now(), 'YYYY') || '-'
         || lpad(nextval('public.mentor_invoice_seq')::text, 6, '0');
$$;

-- ------------------------------------------------------------------
-- 8. RLS + policies  (mirror 20260122000000_stripe_connect_payouts.sql)
--    Mentor: SELECT own. Admin ('admin','admin-dev'): ALL.
-- ------------------------------------------------------------------
ALTER TABLE public.mentor_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentor_invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentor_invoice_documents ENABLE ROW LEVEL SECURITY;

-- mentor_invoices
DROP POLICY IF EXISTS "Mentors can view own invoices" ON public.mentor_invoices;
CREATE POLICY "Mentors can view own invoices"
    ON public.mentor_invoices FOR SELECT
    USING (auth.uid() = mentor_id);

DROP POLICY IF EXISTS "Admins can manage all invoices" ON public.mentor_invoices;
CREATE POLICY "Admins can manage all invoices"
    ON public.mentor_invoices FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
            AND role IN ('admin', 'admin-dev')
        )
    );

-- mentor_invoice_items
DROP POLICY IF EXISTS "Mentors can view own invoice items" ON public.mentor_invoice_items;
CREATE POLICY "Mentors can view own invoice items"
    ON public.mentor_invoice_items FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.mentor_invoices
            WHERE mentor_invoices.id = mentor_invoice_items.invoice_id
            AND mentor_invoices.mentor_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Admins can manage invoice items" ON public.mentor_invoice_items;
CREATE POLICY "Admins can manage invoice items"
    ON public.mentor_invoice_items FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
            AND role IN ('admin', 'admin-dev')
        )
    );

-- mentor_invoice_documents
DROP POLICY IF EXISTS "Mentors can view own invoice documents" ON public.mentor_invoice_documents;
CREATE POLICY "Mentors can view own invoice documents"
    ON public.mentor_invoice_documents FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.mentor_invoices
            WHERE mentor_invoices.id = mentor_invoice_documents.invoice_id
            AND mentor_invoices.mentor_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Admins can manage invoice documents" ON public.mentor_invoice_documents;
CREATE POLICY "Admins can manage invoice documents"
    ON public.mentor_invoice_documents FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
            AND role IN ('admin', 'admin-dev')
        )
    );

-- ------------------------------------------------------------------
-- 9. Private storage bucket `invoices`  (spec §10, mirrors mentor-assets)
--    Path convention (enforced by policy): <mentor_id>/<invoice_id>/<kind>.pdf
--    so the first path segment identifies the owning mentor. Uploads happen via
--    the service-role key on the server (bypasses RLS); these policies gate
--    reads via signed URLs / direct object access.
-- ------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('invoices', 'invoices', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Mentors can read own invoice files" ON storage.objects;
CREATE POLICY "Mentors can read own invoice files"
    ON storage.objects FOR SELECT
    USING (
        bucket_id = 'invoices'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

DROP POLICY IF EXISTS "Admins can manage all invoice files" ON storage.objects;
CREATE POLICY "Admins can manage all invoice files"
    ON storage.objects FOR ALL
    USING (
        bucket_id = 'invoices'
        AND EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
            AND role IN ('admin', 'admin-dev')
        )
    );

-- ------------------------------------------------------------------
-- 10. Indexes
-- ------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_mentor_invoices_mentor_id ON public.mentor_invoices(mentor_id);
CREATE INDEX IF NOT EXISTS idx_mentor_invoices_status ON public.mentor_invoices(status);
CREATE INDEX IF NOT EXISTS idx_mentor_invoice_items_invoice_id ON public.mentor_invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_mentor_invoice_items_session_id ON public.mentor_invoice_items(session_id);
CREATE INDEX IF NOT EXISTS idx_mentor_invoice_documents_invoice_id ON public.mentor_invoice_documents(invoice_id);
CREATE INDEX IF NOT EXISTS idx_sessions_invoice_id ON public.sessions(invoice_id);
