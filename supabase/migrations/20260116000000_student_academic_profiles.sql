-- ==========================================
-- Student Academic Profiles
-- Date: 2026-01-14
-- ==========================================

-- 1. Create student_profiles table for academic information
CREATE TABLE IF NOT EXISTS public.student_profiles (
    id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    -- Basic Info
    school_name TEXT,
    year_group TEXT, -- e.g., "Year 12", "Year 13", "Gap Year"
    target_university TEXT, -- e.g., "Oxford", "Cambridge", "Both"
    target_course TEXT,
    
    -- Academic Info
    subjects JSONB DEFAULT '[]', -- Array of subjects: [{name, predicted_grade}]
    gcse_results JSONB DEFAULT '{}', -- Key-value: {subject: grade}
    
    -- Goals & Preferences
    application_year INTEGER, -- e.g., 2026
    interests TEXT, -- Free text about academic interests
    extracurriculars TEXT, -- Clubs, activities, etc.
    
    -- Profile Status
    is_complete BOOLEAN DEFAULT false,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable RLS
ALTER TABLE public.student_profiles ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
CREATE POLICY "Students can view their own profile" ON public.student_profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Students can insert their own profile" ON public.student_profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Students can update their own profile" ON public.student_profiles
    FOR UPDATE USING (auth.uid() = id);

-- 4. Admins can view all student profiles
CREATE POLICY "Admins can view all student profiles" ON public.student_profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'admin-dev')
        )
    );

-- 5. Trigger for updated_at
CREATE TRIGGER update_student_profiles_updated_at 
BEFORE UPDATE ON public.student_profiles 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
