-- ==========================================
-- Notification trigger: do not roll back INSERT on email failure
-- Date: 2026-03-05
-- ==========================================
-- If the edge function (http_post) fails, the trigger would roll back the
-- entire INSERT, so notifications never appear in-app. This change catches
-- errors so the row is always committed; email is best-effort.

CREATE OR REPLACE FUNCTION public.handle_new_notification()
RETURNS TRIGGER AS $$
DECLARE
  payload JSONB;
  url TEXT;
BEGIN
  url := 'https://msssqttbhlnwypnsewgl.supabase.co/functions/v1/send-email-notifications';

  payload := jsonb_build_object(
    'type', 'INSERT',
    'table', 'notifications',
    'record', row_to_json(NEW)::jsonb,
    'schema', 'public'
  );

  BEGIN
    PERFORM extensions.http_post(
      url,
      payload::text,
      'application/json'
    );
  EXCEPTION WHEN OTHERS THEN
    -- Log but do not re-raise: allow the notification INSERT to commit
    RAISE WARNING 'handle_new_notification: email trigger failed: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
