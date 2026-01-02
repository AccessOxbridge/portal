-- Trigger to handle new user registration
-- 1. Creates a record in public.profiles
-- 2. If role is 'mentor', also creates a record in public.mentors with status 'details_required'

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert into profiles
    INSERT INTO public.profiles (id, full_name, role, email)
    VALUES (
        NEW.id, 
        NEW.raw_user_meta_data->>'full_name', 
        (COALESCE(NEW.raw_user_meta_data->>'role', 'student'))::public.user_role,
        NEW.email
    );

    -- If role is mentor, insert into mentors table
    IF (NEW.raw_user_meta_data->>'role' = 'mentor') THEN
        INSERT INTO public.mentors (id, status)
        VALUES (NEW.id, 'details_required');
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-create the trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
