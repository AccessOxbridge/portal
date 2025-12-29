-- ==========================================
-- Mentor AI Matching & Request System Master SQL
-- Date: 2025-12-26
-- ==========================================

-- 1. Create mentorship_requests table
CREATE TABLE IF NOT EXISTS mentorship_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    mentor_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    responses JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'expired')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create sessions table
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    mentor_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    request_id UUID REFERENCES mentorship_requests(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Enable RLS
ALTER TABLE mentorship_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies for mentorship_requests
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Students can view their own requests') THEN
        CREATE POLICY "Students can view their own requests" ON mentorship_requests
            FOR SELECT USING (auth.uid() = student_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Mentors can view requests sent to them') THEN
        CREATE POLICY "Mentors can view requests sent to them" ON mentorship_requests
            FOR SELECT USING (auth.uid() = mentor_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Mentors can update requests sent to them') THEN
        CREATE POLICY "Mentors can update requests sent to them" ON mentorship_requests
            FOR UPDATE USING (auth.uid() = mentor_id);
    END IF;
END $$;

-- 5. RLS Policies for sessions
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Users can view their own sessions') THEN
        CREATE POLICY "Users can view their own sessions" ON sessions
            FOR SELECT USING (auth.uid() = student_id OR auth.uid() = mentor_id);
    END IF;
END $$;

-- 6. Updated At Triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_mentorship_requests_updated_at') THEN
        CREATE TRIGGER update_mentorship_requests_updated_at
            BEFORE UPDATE ON mentorship_requests
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_sessions_updated_at') THEN
        CREATE TRIGGER update_sessions_updated_at
            BEFORE UPDATE ON sessions
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- 7. Vector Search RPC (match_mentors)
CREATE OR REPLACE FUNCTION match_mentors(
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
