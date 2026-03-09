-- Store Zoom webhook download_token so we can fetch transcript later when
-- raw_transcript is not yet in session_reports (e.g. processTranscript failed or mentor generated report first).
ALTER TABLE public.sessions
ADD COLUMN IF NOT EXISTS transcript_download_token TEXT;
