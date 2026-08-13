-- Student profile photos
--
-- Mentors have had a photo since the start, kept on `mentors.photo_url` and
-- uploaded to the public `mentor-assets` bucket. Students had no equivalent, so
-- everywhere a student appears — chat bubbles, conversation lists, the sidebar —
-- fell back to a coloured initial. The mentor messages page even says so:
-- `photo_url: null, // Students don't have photos`.
--
-- The column goes on `profiles`, not `student_profiles`, because an avatar is
-- identity rather than academic history: `student_profiles` holds school,
-- subjects and grades, and a student who has never opened that form still has a
-- name and a face. Living on `profiles` also means any role can carry one, and
-- the selects that already fetch a profile pick it up without another round
-- trip.

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- A bucket of its own rather than reusing `mentor-assets`. That bucket's name
-- would be a lie for a student's photo, and it carries no size or MIME limits
-- at all — these mirror the ones `lib/image-upload.ts` already enforces, so a
-- bad upload is refused by storage even if it somehow gets past the client.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'avatars',
    'avatars',
    true,
    5242880, -- 5 MB, matching MAX_PHOTO_BYTES
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- An avatar is shown to anyone who can see the person, so reads are public.
-- Writes are confined to a folder named for the uploader's own user id, which
-- is the same shape as the existing `mentor-assets` upload policy.
DROP POLICY IF EXISTS "Avatars are publicly readable" ON storage.objects;
CREATE POLICY "Avatars are publicly readable"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
CREATE POLICY "Users can upload their own avatar"
    ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'avatars'
        AND (storage.foldername(name))[1] = (auth.uid())::text
    );

DROP POLICY IF EXISTS "Users can replace their own avatar" ON storage.objects;
CREATE POLICY "Users can replace their own avatar"
    ON storage.objects FOR UPDATE TO authenticated
    USING (
        bucket_id = 'avatars'
        AND (storage.foldername(name))[1] = (auth.uid())::text
    );

DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;
CREATE POLICY "Users can delete their own avatar"
    ON storage.objects FOR DELETE TO authenticated
    USING (
        bucket_id = 'avatars'
        AND (storage.foldername(name))[1] = (auth.uid())::text
    );

-- Rollback:
--   ALTER TABLE public.profiles DROP COLUMN photo_url;
--   DELETE FROM storage.buckets WHERE id = 'avatars';  -- only when empty
