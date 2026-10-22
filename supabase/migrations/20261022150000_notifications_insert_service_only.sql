-- ==========================================
-- Notifications: only the server may create them
-- Date: 2026-10-22
-- ==========================================
-- No rows change. Finding 2 of the 22 Oct write-rule audit
-- (docs/write-rule-audit.md).
--
-- "Users can insert notifications" was WITH CHECK (true) for every signed-in
-- user, so anyone could create a notification for anyone, with any title,
-- message and recipient_email (the on_notification_created trigger posts
-- each row to the send-email-notifications edge function).
--
-- App code now writes every notification with the service role (which
-- bypasses RLS) after its own authorisation checks, so this rule is dropped
-- and signed-in users can no longer insert notifications directly. Reading,
-- marking viewed and deleting your own notifications are unchanged.
--
-- Apply ONLY after the app code that moved those inserts to the service
-- role is deployed. Before that, booking / session-request / reschedule
-- notifications would silently not be created.
-- ==========================================

DROP POLICY IF EXISTS "Users can insert notifications" ON public.notifications;

-- ------------------------------------------------------------------
-- ROLLBACK (restores the previous rule exactly)
--
--    CREATE POLICY "Users can insert notifications" ON public.notifications
--        FOR INSERT TO authenticated WITH CHECK (true);
-- ------------------------------------------------------------------
