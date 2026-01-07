-- ==========================================
-- Scheduling Reminder Support
-- Date: 2026-01-07
-- ==========================================

-- 1. Add reminder_sent flag to sessions
ALTER TABLE public.sessions 
ADD COLUMN IF NOT EXISTS reminder_sent BOOLEAN DEFAULT false;

-- 2. Add index for performance on reminder cron
CREATE INDEX IF NOT EXISTS idx_sessions_reminders 
ON public.sessions (scheduled_at, reminder_sent, status)
WHERE status = 'active' AND reminder_sent = false;

-- 3. Add notification type for reminder
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_type') THEN
        BEGIN
            ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'session_reminder';
        EXCEPTION WHEN duplicate_object THEN
            -- Value already exists
        END;
    END IF;
END $$;
