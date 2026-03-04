-- ==========================================
-- Second Session Reminder (15 minutes)
-- Date: 2026-03-04
-- ==========================================

-- 1. Add short_reminder_sent flag to sessions for 15-minute reminders
ALTER TABLE public.sessions 
ADD COLUMN IF NOT EXISTS short_reminder_sent BOOLEAN DEFAULT false;

-- 2. Add partial index for performance on 15-minute reminder cron queries
CREATE INDEX IF NOT EXISTS idx_sessions_short_reminders 
ON public.sessions (scheduled_at, short_reminder_sent, status)
WHERE status = 'active' AND short_reminder_sent = false;

