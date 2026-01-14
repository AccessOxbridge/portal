-- ==========================================
-- Post-Session Feedback & Reports
-- Date: 2026-01-12
-- ==========================================

-- 1. Create form_responses table
CREATE TABLE IF NOT EXISTS public.form_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES public.sessions(id) ON DELETE CASCADE NOT NULL,
    form_type TEXT NOT NULL CHECK (form_type IN ('mentor_report', 'student_feedback')),
    respondent_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    responses JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Add personalized report columns to session_reports
ALTER TABLE public.session_reports 
ADD COLUMN IF NOT EXISTS personalized_report TEXT,
ADD COLUMN IF NOT EXISTS personalized_report_generated_at TIMESTAMPTZ;

-- 3. RLS for form_responses
ALTER TABLE public.form_responses ENABLE ROW LEVEL SECURITY;

-- Mentors can insert/view their own reports
CREATE POLICY "Users can insert their own form responses"
    ON public.form_responses FOR INSERT
    WITH CHECK (auth.uid() = respondent_id);

CREATE POLICY "Users can view form responses for their sessions"
    ON public.form_responses FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.sessions
            WHERE sessions.id = form_responses.session_id
            AND (auth.uid() = sessions.student_id OR auth.uid() = sessions.mentor_id)
        )
    );

-- 4. Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_form_responses_session_id 
ON public.form_responses(session_id);

-- 5. Trigger for updated_at if added later
-- (currently not needed since form responses are immutable)
