-- Allow students to update their own mentorship_requests (e.g. to cancel pending requests)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Students can update their own requests') THEN
        CREATE POLICY "Students can update their own requests" ON mentorship_requests
            FOR UPDATE USING (auth.uid() = student_id)
            WITH CHECK (auth.uid() = student_id);
    END IF;
END $$;
