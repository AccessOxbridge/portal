-- ==========================================
-- Email notification tracking
-- Date: 2026-06-15
-- Supports:
--   - Throttled "new message" emails (per recipient, per conversation)
--   - One-shot "how did your first session go?" follow-up emails
-- ==========================================

-- 1. Per-recipient last-notified timestamps on conversations.
--    Used to avoid emailing on every single message in a back-and-forth.
ALTER TABLE conversations
    ADD COLUMN IF NOT EXISTS student_notified_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS mentor_notified_at TIMESTAMPTZ;

-- 2. Flag so the first-session follow-up email is only ever sent once per session.
ALTER TABLE sessions
    ADD COLUMN IF NOT EXISTS first_session_followup_sent BOOLEAN DEFAULT false;
