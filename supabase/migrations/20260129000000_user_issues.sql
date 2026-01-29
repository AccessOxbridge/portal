-- ==========================================
-- User Issues System
-- Date: 2026-01-29
-- ==========================================
-- Enables users (mentors/students) to report issues related to payments or other matters.
-- Admins can view and manage all reported issues.

-- 1. Create user_issues table
CREATE TABLE IF NOT EXISTS public.user_issues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    reporter_type TEXT NOT NULL CHECK (reporter_type IN ('mentor', 'student')),
    issue_type TEXT NOT NULL CHECK (issue_type IN ('payment', 'session', 'technical', 'other')),
    subject TEXT NOT NULL,
    description TEXT NOT NULL,
    payout_id UUID REFERENCES public.mentor_payouts(id) ON DELETE SET NULL,  -- Optional reference to specific payout
    session_id UUID REFERENCES public.sessions(id) ON DELETE SET NULL,        -- Optional reference to specific session
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
    priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    admin_notes TEXT,
    resolved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable RLS
ALTER TABLE public.user_issues ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies

-- Users can view their own issues
CREATE POLICY "Users can view own issues"
    ON public.user_issues FOR SELECT
    USING (auth.uid() = reporter_id);

-- Users can create issues
CREATE POLICY "Users can create issues"
    ON public.user_issues FOR INSERT
    WITH CHECK (auth.uid() = reporter_id);

-- Admins can view and manage all issues
CREATE POLICY "Admins can manage all issues"
    ON public.user_issues FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
            AND role IN ('admin', 'admin-dev')
        )
    );

-- 4. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_issues_reporter_id ON public.user_issues(reporter_id);
CREATE INDEX IF NOT EXISTS idx_user_issues_status ON public.user_issues(status);
CREATE INDEX IF NOT EXISTS idx_user_issues_issue_type ON public.user_issues(issue_type);
CREATE INDEX IF NOT EXISTS idx_user_issues_created_at ON public.user_issues(created_at DESC);

-- 5. Updated at trigger
CREATE TRIGGER update_user_issues_updated_at
    BEFORE UPDATE ON public.user_issues
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
