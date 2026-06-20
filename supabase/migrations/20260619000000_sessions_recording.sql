-- Store Zoom cloud-recording metadata so students/mentors can watch the session
-- recording inside the portal. The MP4 is streamed on demand through our own
-- API (see /api/recording/[sessionId]) using these stored references, so we
-- never expose Zoom's passcode-gated share page.
ALTER TABLE public.sessions
ADD COLUMN IF NOT EXISTS recording_play_url TEXT,
ADD COLUMN IF NOT EXISTS recording_download_url TEXT,
ADD COLUMN IF NOT EXISTS recording_download_token TEXT,
ADD COLUMN IF NOT EXISTS recording_available BOOLEAN NOT NULL DEFAULT false;
