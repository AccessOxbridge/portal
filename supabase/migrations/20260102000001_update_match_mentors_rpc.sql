-- Update match_mentors RPC to use the new status system
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
    AND m.status = 'active'
    ORDER BY similarity DESC
    LIMIT match_count;
END;
$$;
