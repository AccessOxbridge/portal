-- ==========================================
-- Session Reschedule Requests
-- Date: 2026-07-13
-- ==========================================
-- Allows a student or mentor to propose a single new time for an upcoming
-- session. The proposal is stored as a mentorship_requests row linked back to
-- the original session via reschedule_of_session_id. On accept the original
-- session is cancelled and a new session is created; on decline the original
-- stays intact.

-- 1. Link a pending request to the session being rescheduled.
ALTER TABLE public.mentorship_requests
ADD COLUMN IF NOT EXISTS reschedule_of_session_id UUID REFERENCES public.sessions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_mentorship_requests_reschedule_of_session
ON public.mentorship_requests (reschedule_of_session_id)
WHERE reschedule_of_session_id IS NOT NULL;

-- Only one pending reschedule request per session at a time.
CREATE UNIQUE INDEX IF NOT EXISTS mentorship_requests_one_pending_reschedule_per_session
ON public.mentorship_requests (reschedule_of_session_id)
WHERE status = 'pending' AND reschedule_of_session_id IS NOT NULL;

-- 2. Notification types for reschedule lifecycle.
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_type') THEN
        BEGIN
            ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'session_reschedule_request';
        EXCEPTION WHEN duplicate_object THEN NULL;
        END;
        BEGIN
            ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'session_reschedule_accepted';
        EXCEPTION WHEN duplicate_object THEN NULL;
        END;
        BEGIN
            ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'session_reschedule_declined';
        EXCEPTION WHEN duplicate_object THEN NULL;
        END;
    END IF;
END $$;
