-- ==========================================
-- Scheduling System Extension
-- Date: 2025-12-29
-- ==========================================

-- 1. Add time_slots to store student's available datetime slots
-- The responses JSONB field will now contain timeSlots as an array of objects:
-- { date: "2025-01-15", startTime: "14:00", endTime: "15:00" }

-- 2. Add scheduling fields to sessions table
ALTER TABLE public.sessions 
ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS zoom_meeting_id TEXT,
ADD COLUMN IF NOT EXISTS zoom_join_url TEXT,
ADD COLUMN IF NOT EXISTS zoom_start_url TEXT,
ADD COLUMN IF NOT EXISTS selected_slot JSONB;

-- 3. Add notification type for session confirmation
DO $$ BEGIN
    -- Check if the type exists and add new value if needed
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_type') THEN
        BEGIN
            ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'session_confirmed';
        EXCEPTION WHEN duplicate_object THEN
            -- Value already exists, ignore
        END;
    END IF;
END $$;

-- 4. Create index for session scheduling queries
CREATE INDEX IF NOT EXISTS idx_sessions_scheduled_at 
ON public.sessions(scheduled_at) 
WHERE scheduled_at IS NOT NULL;

-- 5. Add policy for inserting sessions (for the accept action)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Mentors can insert sessions when accepting requests') THEN
        CREATE POLICY "Mentors can insert sessions when accepting requests"
            ON public.sessions FOR INSERT
            WITH CHECK (auth.uid() = mentor_id);
    END IF;
END $$;
