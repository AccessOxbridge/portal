-- ==========================================
-- Chat attachments (images + files)
-- Date: 2026-08-11
-- ==========================================
-- ADDITIVE ONLY. This migration never reads, rewrites or deletes an existing
-- row. Every statement is one of: ADD COLUMN (nullable, no default), CREATE
-- INDEX, CREATE BUCKET, CREATE POLICY.
--
-- Existing messages keep `attachments = NULL` and render exactly as they do
-- today. Rollback is section 6 at the bottom of this file.
-- ==========================================

-- ------------------------------------------------------------------
-- 1. Attachment payload on messages
--    Shape: [{ path, name, mime, size, kind, width?, height? }]
--      path  - object path inside the `chat-attachments` bucket
--      kind  - 'image' renders as a thumbnail, 'file' as a download card
--
--    Nullable with no default, so this is a metadata-only change: Postgres
--    does not rewrite the table and the 290 existing rows are untouched.
--
--    `content` stays TEXT NOT NULL — an image-only message stores '' and
--    carries its payload in `attachments`. No constraint change needed.
-- ------------------------------------------------------------------
ALTER TABLE public.messages
    ADD COLUMN IF NOT EXISTS attachments JSONB;

COMMENT ON COLUMN public.messages.attachments IS
    'Array of {path,name,mime,size,kind,width,height}. NULL for text-only messages.';

-- ------------------------------------------------------------------
-- 2. Composite index for thread paging
--    The existing indexes are separate (conversation_id) and (created_at),
--    so ordering a single thread cannot be served by an index alone.
-- ------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created
    ON public.messages (conversation_id, created_at DESC);

-- ------------------------------------------------------------------
-- 3. Private storage bucket `chat-attachments`
--    Private, not public: these are student conversations and a public
--    bucket is URL-guessable. Mirrors the `invoices` bucket pattern.
--
--    Path convention (enforced by the policies below):
--      <conversation_id>/<message_id>/<filename>
--    so the first path segment identifies the owning conversation.
--
--    file_size_limit caps uploads server-side at 10MB regardless of what
--    the client does.
-- ------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'chat-attachments',
    'chat-attachments',
    false,
    10485760,
    ARRAY[
        'image/jpeg', 'image/png', 'image/webp', 'image/gif',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ]
)
ON CONFLICT (id) DO NOTHING;

-- ------------------------------------------------------------------
-- 4. Bucket RLS — a user may read/write an object only when the first path
--    segment is a conversation they participate in. Mirrors the visibility
--    rules already in force on `messages`.
-- ------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.can_access_conversation_folder(object_name TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.conversations c
        WHERE c.id::text = (storage.foldername(object_name))[1]
          AND (
              c.student_id = auth.uid()
              OR c.mentor_id = auth.uid()
              OR c.admin_id = auth.uid()
              OR EXISTS (
                  SELECT 1 FROM public.profiles p
                  WHERE p.id = auth.uid() AND p.role IN ('admin', 'admin-dev')
              )
          )
    );
$$;

DROP POLICY IF EXISTS "Participants can read chat attachments" ON storage.objects;
CREATE POLICY "Participants can read chat attachments"
    ON storage.objects FOR SELECT
    USING (
        bucket_id = 'chat-attachments'
        AND public.can_access_conversation_folder(name)
    );

DROP POLICY IF EXISTS "Participants can upload chat attachments" ON storage.objects;
CREATE POLICY "Participants can upload chat attachments"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'chat-attachments'
        AND public.can_access_conversation_folder(name)
    );

-- Deliberately no UPDATE or DELETE policy: attachments are immutable once
-- sent. Cleanup, if ever needed, happens via the service-role key.

-- ------------------------------------------------------------------
-- 5. Realtime
--    `messages` is already in the supabase_realtime publication (added in
--    20260114000000). Publications are per-table, not per-column, so the new
--    column flows through existing subscriptions with no change here.
-- ------------------------------------------------------------------

-- ------------------------------------------------------------------
-- 6. ROLLBACK
--    Safe to run at any time. Dropping the column discards only attachment
--    metadata; every message body lives in `content` and is never touched.
--
--    DROP POLICY IF EXISTS "Participants can upload chat attachments" ON storage.objects;
--    DROP POLICY IF EXISTS "Participants can read chat attachments" ON storage.objects;
--    DROP FUNCTION IF EXISTS public.can_access_conversation_folder(TEXT);
--    DELETE FROM storage.buckets WHERE id = 'chat-attachments';  -- only when empty
--    DROP INDEX IF EXISTS public.idx_messages_conversation_created;
--    ALTER TABLE public.messages DROP COLUMN IF EXISTS attachments;
-- ------------------------------------------------------------------
