-- Mentor onboarding questionnaire
-- Replaces the (now hidden) Training + Quiz steps with a short questionnaire.
-- The legacy training_completed_at / quiz_completed_at / quiz_answers columns
-- are intentionally LEFT IN PLACE (hidden in the UI, not dropped).

-- 4 dedicated free-text answer columns
ALTER TABLE public.mentors ADD COLUMN IF NOT EXISTS q_oxbridge_college TEXT;
ALTER TABLE public.mentors ADD COLUMN IF NOT EXISTS q_specialisation TEXT;
ALTER TABLE public.mentors ADD COLUMN IF NOT EXISTS q_alevels TEXT;
ALTER TABLE public.mentors ADD COLUMN IF NOT EXISTS q_approach TEXT;

-- Completion timestamp for the questionnaire step
ALTER TABLE public.mentors ADD COLUMN IF NOT EXISTS questionnaire_completed_at TIMESTAMPTZ;

COMMENT ON COLUMN public.mentors.q_oxbridge_college IS 'Q1: Oxford/Cambridge attendance, college, and subject studied';
COMMENT ON COLUMN public.mentors.q_specialisation IS 'Q2: Area of subject the mentor specialises in / is most passionate about';
COMMENT ON COLUMN public.mentors.q_alevels IS 'Q3: A-levels (or equivalent) taken and grades achieved';
COMMENT ON COLUMN public.mentors.q_approach IS 'Q4: Mentor''s approach to working with students';
COMMENT ON COLUMN public.mentors.questionnaire_completed_at IS 'When the mentor completed the onboarding questionnaire';
