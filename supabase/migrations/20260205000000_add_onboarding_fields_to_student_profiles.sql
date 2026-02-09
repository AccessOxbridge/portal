-- ==========================================
-- Add onboarding fields to student_profiles
-- Date: 2026-02-05
-- ==========================================

-- Add new columns for fields that were in onboarding but not in academic profile
ALTER TABLE public.student_profiles
ADD COLUMN IF NOT EXISTS school_country TEXT,
ADD COLUMN IF NOT EXISTS curriculum TEXT, -- 'IB', 'A-Level', 'Other'
ADD COLUMN IF NOT EXISTS curriculum_other TEXT, -- If curriculum is 'Other'
ADD COLUMN IF NOT EXISTS timezone TEXT,
ADD COLUMN IF NOT EXISTS additional_notes TEXT; -- "Anything else" field

-- Update target_university to support multiple targets (now stores as text array in jsonb)
-- Keeping as TEXT for backwards compatibility - can store comma-separated or single value
