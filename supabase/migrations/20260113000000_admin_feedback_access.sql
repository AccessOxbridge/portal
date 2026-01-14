-- ==========================================
-- Fix: Allow admins to view all form responses
-- Date: 2026-01-13
-- ==========================================

-- Admin policy for form_responses
CREATE POLICY "Admins can view all form responses"
    ON public.form_responses FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'admin-dev')
        )
    );
