-- Create creators table
CREATE TABLE IF NOT EXISTS public.creators (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    bio TEXT,
    tracking_code TEXT NOT NULL UNIQUE,
    referrals_count INTEGER DEFAULT 0
);

-- Enable RLS
ALTER TABLE public.creators ENABLE ROW LEVEL SECURITY;

-- create policy for admins
CREATE POLICY "Admins can view all creators" 
ON public.creators FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('admin', 'admin-dev')
  )
);

CREATE POLICY "Admins can insert creators" 
ON public.creators FOR INSERT 
TO authenticated 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('admin', 'admin-dev')
  )
);

CREATE POLICY "Admins can update creators" 
ON public.creators FOR UPDATE
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('admin', 'admin-dev')
  )
);

CREATE POLICY "Admins can delete creators" 
ON public.creators FOR DELETE
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('admin', 'admin-dev')
  )
);


-- Function to increment referral count
CREATE OR REPLACE FUNCTION public.increment_referral_count() 
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.member_code IS NOT NULL THEN
        UPDATE public.creators
        SET referrals_count = COALESCE(referrals_count, 0) + 1
        WHERE tracking_code = NEW.member_code;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on profiles table
DROP TRIGGER IF EXISTS on_profile_created_referral ON public.profiles;
CREATE TRIGGER on_profile_created_referral
    AFTER INSERT ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.increment_referral_count();
