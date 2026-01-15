-- Create events table for admin-managed webinars and in-person events
CREATE TABLE public.events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    event_type TEXT NOT NULL CHECK (event_type IN ('webinar', 'in_person')),
    date TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ,
    duration_minutes INTEGER,
    location TEXT,              -- For in-person events
    meeting_url TEXT,           -- For webinars (Zoom link, etc.)
    host TEXT,
    capacity INTEGER,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    recording_url TEXT,         -- For past webinars
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create event registrations table
CREATE TABLE public.event_registrations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    registered_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(event_id, user_id)
);

-- Enable RLS
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;

-- Events policies
-- Anyone authenticated can view active events
CREATE POLICY "Authenticated users can view active events"
    ON public.events
    FOR SELECT
    TO authenticated
    USING (is_active = true);

-- Admins can view all events (including inactive)
CREATE POLICY "Admins can view all events"
    ON public.events
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'admin-dev')
        )
    );

-- Admins can insert events
CREATE POLICY "Admins can insert events"
    ON public.events
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'admin-dev')
        )
    );

-- Admins can update events
CREATE POLICY "Admins can update events"
    ON public.events
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'admin-dev')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'admin-dev')
        )
    );

-- Admins can delete events
CREATE POLICY "Admins can delete events"
    ON public.events
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'admin-dev')
        )
    );

-- Event registrations policies
-- Users can view their own registrations
CREATE POLICY "Users can view own registrations"
    ON public.event_registrations
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- Admins can view all registrations
CREATE POLICY "Admins can view all registrations"
    ON public.event_registrations
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'admin-dev')
        )
    );

-- Users can register for events
CREATE POLICY "Users can register for events"
    ON public.event_registrations
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

-- Users can unregister from events
CREATE POLICY "Users can unregister from events"
    ON public.event_registrations
    FOR DELETE
    TO authenticated
    USING (user_id = auth.uid());

-- Create index for faster queries
CREATE INDEX idx_events_type ON public.events(event_type);
CREATE INDEX idx_events_date ON public.events(date);
CREATE INDEX idx_events_active ON public.events(is_active);
CREATE INDEX idx_event_registrations_event ON public.event_registrations(event_id);
CREATE INDEX idx_event_registrations_user ON public.event_registrations(user_id);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER events_updated_at
    BEFORE UPDATE ON public.events
    FOR EACH ROW
    EXECUTE FUNCTION update_events_updated_at();
