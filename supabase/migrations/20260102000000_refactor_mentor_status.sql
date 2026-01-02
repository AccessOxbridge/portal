-- Create mentor_status enum
DO $$ BEGIN
    CREATE TYPE public.mentor_status AS ENUM ('active', 'pending_approval', 'details_required');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add columns to mentors table
ALTER TABLE public.mentors ADD COLUMN IF NOT EXISTS status public.mentor_status DEFAULT 'details_required';
ALTER TABLE public.mentors ADD COLUMN IF NOT EXISTS responses JSONB DEFAULT '{}'::jsonb;

-- Migrate data from mentor_applications to mentors
-- If a mentor exists in both, we take the response from applications
-- and set status based on the application status.
INSERT INTO public.mentors (id, responses, status)
SELECT 
    user_id, 
    responses, 
    CASE 
        WHEN status = 'approved' THEN 'active'::public.mentor_status
        WHEN status = 'dismissed' THEN 'details_required'::public.mentor_status -- Or handle differently
        ELSE 'pending_approval'::public.mentor_status
    END
FROM public.mentor_applications
ON CONFLICT (id) DO UPDATE SET
    responses = EXCLUDED.responses,
    status = EXCLUDED.status;

-- Handle existing active mentors who don't have an application (legacy)
UPDATE public.mentors SET status = 'active' WHERE status IS NULL OR status = 'details_required' AND is_active = true;

-- Remove old table
DROP TABLE IF EXISTS public.mentor_applications CASCADE;

-- Update RLS policies for mentors
DROP POLICY IF EXISTS "Public can view active mentors" ON public.mentors;
CREATE POLICY "Public can view active mentors" 
ON public.mentors FOR SELECT 
USING (status = 'active');

DROP POLICY IF EXISTS "Mentors can view their own profile" ON public.mentors;
CREATE POLICY "Mentors can view their own profile" 
ON public.mentors FOR SELECT 
USING (auth.uid() = id);

DROP POLICY IF EXISTS "Mentors can update their own profile" ON public.mentors;
CREATE POLICY "Mentors can update their own profile" 
ON public.mentors FOR UPDATE 
USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can manage mentors" ON public.mentors;
CREATE POLICY "Admins can manage mentors" 
ON public.mentors FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role IN ('admin'::user_role, 'admin-dev'::user_role)
    )
);
