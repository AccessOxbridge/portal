-- ==========================================
-- Admin <-> Mentor "support" conversations
-- Date: 2026-06-30
-- ==========================================
-- Lets admins message a mentor directly from the admin dashboard. To the
-- mentor these threads appear to come from "Claire Marlowe" (the Access
-- Oxbridge team), mirroring the existing student<->admin support threads.
--
-- A mentor_support conversation has a mentor but NO student, so student_id
-- must be nullable and the `type` discriminator gains a third value.
-- ==========================================

-- 1. Allow conversations without a student (admin <-> mentor support chats).
ALTER TABLE public.conversations ALTER COLUMN student_id DROP NOT NULL;

-- 2. Extend the type discriminator with 'mentor_support'.
ALTER TABLE public.conversations DROP CONSTRAINT IF EXISTS conversations_type_check;
ALTER TABLE public.conversations
    ADD CONSTRAINT conversations_type_check
    CHECK (type IN ('mentor', 'support', 'mentor_support'));

-- 3. At most one mentor_support conversation per mentor (shared by all admins).
CREATE UNIQUE INDEX IF NOT EXISTS idx_conversations_mentor_support_per_mentor
    ON public.conversations (mentor_id)
    WHERE type = 'mentor_support';

-- RLS note: existing conversation/message policies already cover these rows.
-- Admins (role admin/admin-dev) have full access, and the mentor can read/reply
-- via the `mentor_id = auth.uid()` checks. No policy changes required.
