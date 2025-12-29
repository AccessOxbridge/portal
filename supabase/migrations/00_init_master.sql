-- ====================================================================
-- OXBRIDGE MENTORSHIP PORTAL - MASTER INITIALIZATION SCRIPT
-- ====================================================================
-- This script initializes the database schema from scratch.
-- Includes: Extensions, Enums, Tables, RLS, and AI Functions.

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. CUSTOM TYPES / ENUMS
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('student', 'mentor', 'admin', 'client', 'admin-dev');
    END IF;
END $$;

-- 3. TABLES

-- Profiles (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    role user_role DEFAULT 'student',
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- Mentor Applications (Internal use)
CREATE TABLE IF NOT EXISTS public.mentor_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    responses JSONB,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'dismissed')),
    cv_url TEXT,
    photo_url TEXT,
    embedding vector(1536),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- Active Mentors
CREATE TABLE IF NOT EXISTS public.mentors (
    id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    bio TEXT,
    expertise TEXT[],
    is_active BOOLEAN DEFAULT true,
    cv_url TEXT,
    photo_url TEXT,
    embedding vector(1536),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- Mentorship Requests (Student to Mentor)
CREATE TABLE IF NOT EXISTS public.mentorship_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    mentor_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    responses JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'expired')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Mentorship Sessions
CREATE TABLE IF NOT EXISTS public.sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    mentor_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    request_id UUID REFERENCES public.mentorship_requests(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- KV Store (Generic for Edge Functions/Caching)
CREATE TABLE IF NOT EXISTS public.kv_store_9a66e4d9 (
    key TEXT PRIMARY KEY,
    value JSONB,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- 4. ROW LEVEL SECURITY (RLS)

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentor_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentorship_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Public profiles are viewable by everyone." ON public.profiles
    FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile." ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile." ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- Mentorship Requests Policies
CREATE POLICY "Students can view their own requests" ON mentorship_requests
    FOR SELECT USING (auth.uid() = student_id);

CREATE POLICY "Mentors can view requests sent to them" ON mentorship_requests
    FOR SELECT USING (auth.uid() = mentor_id);

CREATE POLICY "Mentors can update requests sent to them" ON mentorship_requests
    FOR UPDATE USING (auth.uid() = mentor_id);

-- Sessions Policies
CREATE POLICY "Users can view their own sessions" ON sessions
    FOR SELECT USING (auth.uid() = student_id OR auth.uid() = mentor_id);

-- 5. FUNCTIONS & TRIGGERS

-- Auto-update updated_at column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_mentorship_requests_updated_at BEFORE UPDATE ON public.mentorship_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON public.sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Vector Matching Function
CREATE OR REPLACE FUNCTION public.match_mentors(
    query_embedding vector(1536), 
    match_threshold float, 
    match_count int
)
RETURNS TABLE (
    id UUID,
    bio TEXT,
    expertise TEXT[],
    photo_url TEXT,
    full_name TEXT,
    similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        m.id,
        m.bio,
        m.expertise,
        m.photo_url,
        p.full_name,
        1 - (m.embedding <=> query_embedding) AS similarity
    FROM mentors m
    JOIN profiles p ON m.id = p.id
    WHERE 1 - (m.embedding <=> query_embedding) > match_threshold
    AND m.is_active = true
    ORDER BY similarity DESC
    LIMIT match_count;
END;
$$;
