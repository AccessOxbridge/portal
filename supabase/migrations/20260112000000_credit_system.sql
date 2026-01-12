-- ==========================================
-- Credit-Based Payment System
-- Date: 2026-01-12
-- ==========================================
-- Implements a credit system for booking mentorship sessions.
-- 1 credit = 1 hour of tutoring time.

-- 1. Add credits and Stripe fields to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS credits INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

-- 2. Credit Packages (DYNAMIC - editable via Supabase dashboard)
CREATE TABLE IF NOT EXISTS public.credit_packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    credits INTEGER NOT NULL,
    price_cents INTEGER NOT NULL, -- Price in smallest currency unit (pence/cents)
    currency TEXT NOT NULL DEFAULT 'gbp',
    stripe_price_id TEXT, -- Optional: link to Stripe Price object
    description TEXT,
    is_popular BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Credit Purchases (links Stripe checkout to user)
CREATE TABLE IF NOT EXISTS public.credit_purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    package_id UUID REFERENCES public.credit_packages(id) ON DELETE SET NULL,
    stripe_session_id TEXT UNIQUE,
    stripe_payment_intent_id TEXT,
    credits_purchased INTEGER NOT NULL,
    amount_paid_cents INTEGER NOT NULL,
    currency TEXT NOT NULL DEFAULT 'gbp',
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- 4. Credit Transactions (audit trail for all credit changes)
CREATE TABLE IF NOT EXISTS public.credit_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    amount INTEGER NOT NULL, -- Positive = credit, Negative = debit
    balance_after INTEGER NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('purchase', 'booking', 'refund', 'admin_adjustment', 'bonus')),
    description TEXT,
    reference_id UUID, -- Can reference purchase_id, session_id, etc.
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Enable RLS
ALTER TABLE public.credit_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies

-- Credit Packages: Anyone can view active packages
CREATE POLICY "Anyone can view active credit packages"
    ON public.credit_packages FOR SELECT
    USING (is_active = true);

-- Credit Packages: Only admins can manage
CREATE POLICY "Admins can manage credit packages"
    ON public.credit_packages FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
            AND role IN ('admin', 'admin-dev')
        )
    );

-- Credit Purchases: Users can view their own purchases
CREATE POLICY "Users can view own purchases"
    ON public.credit_purchases FOR SELECT
    USING (auth.uid() = user_id);

-- Credit Purchases: Service role can insert (for webhooks)
CREATE POLICY "Service can insert purchases"
    ON public.credit_purchases FOR INSERT
    WITH CHECK (true);

-- Credit Purchases: Service role can update (for webhooks)
CREATE POLICY "Service can update purchases"
    ON public.credit_purchases FOR UPDATE
    USING (true);

-- Credit Transactions: Users can view their own transactions
CREATE POLICY "Users can view own transactions"
    ON public.credit_transactions FOR SELECT
    USING (auth.uid() = user_id);

-- Credit Transactions: Service role can insert
CREATE POLICY "Service can insert transactions"
    ON public.credit_transactions FOR INSERT
    WITH CHECK (true);

-- 7. Updated At Triggers
CREATE TRIGGER update_credit_packages_updated_at
    BEFORE UPDATE ON public.credit_packages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 8. Insert default credit packages (editable later in Supabase dashboard)
INSERT INTO public.credit_packages (name, credits, price_cents, currency, description, is_popular, sort_order) VALUES
    ('Starter', 5, 4900, 'gbp', '5 hours of 1-on-1 mentorship', false, 1),
    ('Popular', 10, 8900, 'gbp', '10 hours of 1-on-1 mentorship - Best Value!', true, 2),
    ('Pro', 20, 16900, 'gbp', '20 hours of 1-on-1 mentorship - Save £29!', false, 3)
ON CONFLICT DO NOTHING;

-- 9. Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_credit_purchases_user_id ON public.credit_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_purchases_stripe_session ON public.credit_purchases(stripe_session_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id ON public.credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_packages_active ON public.credit_packages(is_active, sort_order);
