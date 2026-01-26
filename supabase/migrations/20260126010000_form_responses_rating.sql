-- ==========================================
-- Add Rating Column to Form Responses
-- Date: 2026-01-26
-- ==========================================

-- Add rating column (1-5 scale) for student feedback
ALTER TABLE public.form_responses 
ADD COLUMN IF NOT EXISTS rating INTEGER CHECK (rating >= 1 AND rating <= 5);

-- Create index for faster aggregation queries
CREATE INDEX IF NOT EXISTS idx_form_responses_rating 
ON public.form_responses(session_id, rating) 
WHERE form_type = 'student_feedback';
