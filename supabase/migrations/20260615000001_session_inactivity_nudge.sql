-- ==========================================
-- Session inactivity nudge tracking
-- Date: 2026-06-15
-- Throttles the "time to book your next session" nudge emails so a pair is
-- reminded at most once per cooldown window, not every day the cron runs.
-- ==========================================

ALTER TABLE student_mentor_assignments
    ADD COLUMN IF NOT EXISTS last_inactivity_nudge_at TIMESTAMPTZ;
