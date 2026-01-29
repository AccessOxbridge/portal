-- Mentor Onboarding Tracking Columns
-- Run this migration in Supabase SQL Editor

-- Add columns for tracking onboarding completion
ALTER TABLE mentors ADD COLUMN IF NOT EXISTS training_completed_at TIMESTAMPTZ;
ALTER TABLE mentors ADD COLUMN IF NOT EXISTS quiz_completed_at TIMESTAMPTZ;
ALTER TABLE mentors ADD COLUMN IF NOT EXISTS quiz_answers JSONB;
ALTER TABLE mentors ADD COLUMN IF NOT EXISTS contract_signed_at TIMESTAMPTZ;
ALTER TABLE mentors ADD COLUMN IF NOT EXISTS contract_signature TEXT;
ALTER TABLE mentors ADD COLUMN IF NOT EXISTS dbs_certificate_url TEXT;
ALTER TABLE mentors ADD COLUMN IF NOT EXISTS profile_completed_at TIMESTAMPTZ;
ALTER TABLE mentors ADD COLUMN IF NOT EXISTS university TEXT;

-- Add comments for documentation
COMMENT ON COLUMN mentors.training_completed_at IS 'When the mentor completed the training content';
COMMENT ON COLUMN mentors.quiz_completed_at IS 'When the mentor completed the training quiz';
COMMENT ON COLUMN mentors.quiz_answers IS 'JSON object storing the mentor quiz answers';
COMMENT ON COLUMN mentors.contract_signed_at IS 'When the mentor signed the contract';
COMMENT ON COLUMN mentors.contract_signature IS 'Digital signature (full name) on the contract';
COMMENT ON COLUMN mentors.dbs_certificate_url IS 'URL to the uploaded DBS certificate';
COMMENT ON COLUMN mentors.profile_completed_at IS 'When the mentor completed their profile';
COMMENT ON COLUMN mentors.university IS 'University the mentor attended';

-- Create storage bucket for mentor documents if it doesn't exist
-- Note: Run this in Supabase dashboard -> Storage -> Create bucket
-- Bucket name: mentor-documents (private)
-- Bucket name: mentor-photos (public, for profile photos)
