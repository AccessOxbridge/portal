-- Allow students to insert their own mentorship requests
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Students can insert mentorship requests') THEN
        CREATE POLICY "Students can insert mentorship requests"
        ON public.mentorship_requests
        FOR INSERT
        TO authenticated
        WITH CHECK (auth.uid() = student_id);
    END IF;
END $$;

-- Allow users to insert notifications (e.g. for mentors)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Users can insert notifications') THEN
        CREATE POLICY "Users can insert notifications"
        ON public.notifications
        FOR INSERT
        TO authenticated
        WITH CHECK (true);
    END IF;
END $$;
