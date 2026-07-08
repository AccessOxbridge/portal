-- ==========================================
-- Mentor-Initiated Session Requests
-- Date: 2026-07-09
-- ==========================================
-- Allows a mentor to propose a session time to one of their assigned
-- students. The student then accepts/declines from their "Pending" tab,
-- reusing the exact same acceptance logic (Zoom meeting + sessions row +
-- notifications) that already runs when a mentor accepts a student's
-- request — just with the responder roles swapped.

-- 1. Track who initiated a mentorship_requests row.
ALTER TABLE public.mentorship_requests
ADD COLUMN IF NOT EXISTS initiated_by TEXT NOT NULL DEFAULT 'student'
    CHECK (initiated_by IN ('student', 'mentor'));

-- 2. New notification type for a mentor-initiated request landing with a student.
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_type') THEN
        BEGIN
            ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'mentor_session_request';
        EXCEPTION WHEN duplicate_object THEN
            -- Value already exists, ignore
        END;
    END IF;
END $$;

-- 3. Allow a mentor to create a mentorship_requests row targeting their own student.
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Mentors can insert mentorship requests for their students') THEN
        CREATE POLICY "Mentors can insert mentorship requests for their students"
        ON public.mentorship_requests
        FOR INSERT
        TO authenticated
        WITH CHECK (auth.uid() = mentor_id);
    END IF;
END $$;

-- 4. Allow a student to insert the confirmed session row when they accept a
--    mentor-initiated request (mirrors the existing mentor insert policy).
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Students can insert sessions when accepting requests') THEN
        CREATE POLICY "Students can insert sessions when accepting requests"
            ON public.sessions FOR INSERT
            WITH CHECK (auth.uid() = student_id);
    END IF;
END $$;
