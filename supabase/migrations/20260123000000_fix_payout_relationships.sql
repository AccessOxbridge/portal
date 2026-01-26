-- ==========================================
-- Fix Payout Relationships
-- Date: 2026-01-23
-- ==========================================

-- 1. Add direct foreign key from sessions to mentors
-- This helps Postgrest understand the relationship and improves data integrity
-- (sessions can only be linked to users who are actually mentors)
-- We use a named constraint so it's easy to manage.

DO $$ 
BEGIN
    -- Check if the mentors table exists and the sessions table exists
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'mentors') AND 
       EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'sessions') THEN
        
        -- Drop the old generic profiles FK if it exists (optional, but cleaner)
        -- ALTER TABLE public.sessions DROP CONSTRAINT IF EXISTS sessions_mentor_id_fkey;
        
        -- Add the new FK to mentors table
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sessions_mentor_id_mentors_fkey') THEN
            ALTER TABLE public.sessions
            ADD CONSTRAINT sessions_mentor_id_mentors_fkey 
            FOREIGN KEY (mentor_id) REFERENCES public.mentors(id) ON DELETE CASCADE;
        END IF;

    END IF;
END $$;
