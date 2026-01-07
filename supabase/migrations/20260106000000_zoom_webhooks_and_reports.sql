-- ==========================================
-- Zoom Webhooks & AI Reports
-- Date: 2026-01-06
-- ==========================================

-- 1. Add status tracking to sessions
ALTER TABLE public.sessions 
ADD COLUMN IF NOT EXISTS zoom_meeting_status TEXT DEFAULT 'waiting' CHECK (zoom_meeting_status IN ('waiting', 'started', 'ended')),
ADD COLUMN IF NOT EXISTS transcript_url TEXT;

-- 2. Create session_reports table
CREATE TABLE IF NOT EXISTS public.session_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES public.sessions(id) ON DELETE CASCADE NOT NULL,
    summary TEXT,
    key_points JSONB, -- Array of key takeaways
    action_items JSONB, -- Array of follow-up tasks
    raw_transcript TEXT, -- Cleaned plain text transcript
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Add RLS for session_reports
ALTER TABLE public.session_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view reports for their own sessions" ON public.session_reports
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.sessions
            WHERE sessions.id = session_reports.session_id
            AND (auth.uid() = sessions.student_id OR auth.uid() = sessions.mentor_id)
        )
    );

-- 4. Trigger for updated_at
CREATE TRIGGER update_session_reports_updated_at 
BEFORE UPDATE ON public.session_reports 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
