-- Background check confirmation (for mentors who confirm without uploading DBS)
ALTER TABLE mentors ADD COLUMN IF NOT EXISTS background_check_confirmed_at TIMESTAMPTZ;
COMMENT ON COLUMN mentors.background_check_confirmed_at IS 'When the mentor confirmed they have no criminal convictions/cautions (Background Checks step)';
