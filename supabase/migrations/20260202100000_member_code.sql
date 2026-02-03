-- Migration: Add member_code column to profiles table
-- This column stores referral/partner codes used during signup for tracking:
-- - Partner referrals and commission tracking
-- - Pre-bought packages from school deals
-- - Student discount eligibility

-- Add the member_code column to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS member_code TEXT DEFAULT NULL;

-- Update the signup trigger to include member_code
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert into profiles (now including member_code)
    INSERT INTO public.profiles (id, full_name, role, email, member_code)
    VALUES (
        NEW.id, 
        NEW.raw_user_meta_data->>'full_name', 
        (COALESCE(NEW.raw_user_meta_data->>'role', 'student'))::public.user_role,
        NEW.email,
        NEW.raw_user_meta_data->>'member_code'
    );

    -- If role is mentor, insert into mentors table
    IF (NEW.raw_user_meta_data->>'role' = 'mentor') THEN
        INSERT INTO public.mentors (id, status)
        VALUES (NEW.id, 'details_required');
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-create the trigger on auth.users to ensure we're using the updated function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Add an index on member_code for efficient lookups when querying referrals
CREATE INDEX IF NOT EXISTS idx_profiles_member_code ON public.profiles(member_code) WHERE member_code IS NOT NULL;
