-- Create blog categories enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'blog_category') THEN
        CREATE TYPE blog_category AS ENUM (
            'Oxbridge Admissions',
            'Interview Tips',
            'Personal Statement',
            'UK Universities',
            'Student Stories'
        );
    END IF;
END $$;

-- Create articles table
CREATE TABLE IF NOT EXISTS public.articles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    author TEXT NOT NULL,
    published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    category blog_category NOT NULL,
    tags TEXT[] DEFAULT '{}',
    image TEXT NOT NULL,
    featured BOOLEAN DEFAULT false,
    body TEXT NOT NULL,
    reading_time INTEGER NOT NULL,
    permalink TEXT GENERATED ALWAYS AS ('/blog/' || slug) STORED,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;

-- RLS Policies (public read, authenticated write)
CREATE POLICY "Articles are viewable by everyone" ON public.articles
    FOR SELECT USING (true);

-- Authenticated users can create/update articles
CREATE POLICY "Authenticated users can create articles" ON public.articles
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update articles" ON public.articles
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Service role can bypass RLS for migrations/admin operations
CREATE POLICY "Service role can manage articles" ON public.articles
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Indexes for performance
CREATE INDEX idx_articles_slug ON public.articles(slug);
CREATE INDEX idx_articles_category ON public.articles(category);
CREATE INDEX idx_articles_featured ON public.articles(featured);
CREATE INDEX idx_articles_published_at ON public.articles(published_at DESC);
CREATE INDEX idx_articles_tags ON public.articles USING GIN(tags);

-- Trigger for updated_at
CREATE TRIGGER update_articles_updated_at
    BEFORE UPDATE ON public.articles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
