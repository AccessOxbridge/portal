-- ==========================================
-- Allow admins to update student_profiles (e.g. parent_email)
-- Date: 2026-02-27
-- ==========================================

CREATE POLICY "Admins can update student profiles" ON public.student_profiles
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'admin-dev')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'admin-dev')
        )
    );
