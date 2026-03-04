-- Allow users to delete their own notifications (for "Clear all")
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Users can delete their own notifications') THEN
        CREATE POLICY "Users can delete their own notifications"
            ON public.notifications FOR DELETE
            USING (auth.uid() = recipient_id);
    END IF;
END $$;
