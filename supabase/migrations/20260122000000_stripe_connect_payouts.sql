-- ==========================================
-- Stripe Connect Payouts System
-- Date: 2026-01-22
-- ==========================================
-- Enables paying mentors via Stripe Connect Express accounts.
-- Tracks fortnightly payout batches and individual session payouts.

-- 1. Add Stripe Connect fields to mentors table
ALTER TABLE public.mentors 
ADD COLUMN IF NOT EXISTS hourly_rate_cents INTEGER DEFAULT 2500,  -- £25/hour default
ADD COLUMN IF NOT EXISTS stripe_account_id TEXT,                  -- Stripe Connect Express account ID
ADD COLUMN IF NOT EXISTS payouts_enabled BOOLEAN DEFAULT false;   -- True after onboarding complete

-- 2. Add session duration for calculating payouts
ALTER TABLE public.sessions 
ADD COLUMN IF NOT EXISTS duration_minutes INTEGER DEFAULT 60;      -- Session length in minutes

-- 3. Mentor Payouts (batch records for fortnightly payouts)
CREATE TABLE IF NOT EXISTS public.mentor_payouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mentor_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    stripe_payout_id TEXT,                                        -- Stripe Payout ID after processing
    stripe_transfer_id TEXT,                                      -- Stripe Transfer ID
    period_start DATE NOT NULL,                                   -- Start of fortnight
    period_end DATE NOT NULL,                                     -- End of fortnight
    sessions_count INTEGER NOT NULL DEFAULT 0,
    total_minutes INTEGER NOT NULL DEFAULT 0,                     -- Total session time
    amount_cents INTEGER NOT NULL DEFAULT 0,                      -- Total payout amount
    currency TEXT NOT NULL DEFAULT 'gbp',
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'paid', 'failed')),
    failure_message TEXT,                                         -- Error message if failed
    processed_at TIMESTAMPTZ,                                     -- When payout was initiated
    paid_at TIMESTAMPTZ,                                          -- When payout completed
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Payout Items (individual sessions included in a payout batch)
CREATE TABLE IF NOT EXISTS public.mentor_payout_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payout_id UUID REFERENCES public.mentor_payouts(id) ON DELETE CASCADE NOT NULL,
    session_id UUID REFERENCES public.sessions(id) ON DELETE SET NULL,
    duration_minutes INTEGER NOT NULL,
    hourly_rate_cents INTEGER NOT NULL,
    amount_cents INTEGER NOT NULL,                                -- (duration_minutes / 60) * hourly_rate_cents
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Enable RLS
ALTER TABLE public.mentor_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentor_payout_items ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies

-- Mentors can view their own payouts
CREATE POLICY "Mentors can view own payouts"
    ON public.mentor_payouts FOR SELECT
    USING (auth.uid() = mentor_id);

-- Admins can view and manage all payouts
CREATE POLICY "Admins can manage all payouts"
    ON public.mentor_payouts FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
            AND role IN ('admin', 'admin-dev')
        )
    );

-- Payout items: Mentors can view their own
CREATE POLICY "Mentors can view own payout items"
    ON public.mentor_payout_items FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.mentor_payouts
            WHERE mentor_payouts.id = mentor_payout_items.payout_id
            AND mentor_payouts.mentor_id = auth.uid()
        )
    );

-- Admins can manage payout items
CREATE POLICY "Admins can manage payout items"
    ON public.mentor_payout_items FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
            AND role IN ('admin', 'admin-dev')
        )
    );

-- 7. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_mentor_payouts_mentor_id ON public.mentor_payouts(mentor_id);
CREATE INDEX IF NOT EXISTS idx_mentor_payouts_period ON public.mentor_payouts(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_mentor_payouts_status ON public.mentor_payouts(status);
CREATE INDEX IF NOT EXISTS idx_mentor_payout_items_payout_id ON public.mentor_payout_items(payout_id);
CREATE INDEX IF NOT EXISTS idx_sessions_completed_mentor ON public.sessions(mentor_id, status) 
    WHERE status = 'completed';

-- 8. Updated at trigger for payouts
CREATE TRIGGER update_mentor_payouts_updated_at
    BEFORE UPDATE ON public.mentor_payouts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
