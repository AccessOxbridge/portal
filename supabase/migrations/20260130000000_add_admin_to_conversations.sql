-- ==========================================
-- Add Admin to Conversations (3-way Chat)
-- Date: 2026-01-30
-- ==========================================

-- 1. Add admin_id column to conversations table
ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS admin_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- 2. Drop existing unique constraint to allow multiple conversations with same student-mentor but different sessions
ALTER TABLE conversations DROP CONSTRAINT IF EXISTS conversations_student_id_mentor_id_key;

-- 3. Add new unique constraint including session_id
ALTER TABLE conversations ADD CONSTRAINT conversations_student_mentor_session_unique 
  UNIQUE(student_id, mentor_id, session_id);

-- 4. Update RLS Policies for conversations
-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own conversations" ON conversations;
DROP POLICY IF EXISTS "Users can create conversations" ON conversations;
DROP POLICY IF EXISTS "Users can update their own conversations" ON conversations;

-- Create new policies that include admin
CREATE POLICY "Users can view their own conversations" ON conversations
    FOR SELECT USING (
        auth.uid() = student_id OR 
        auth.uid() = mentor_id OR 
        auth.uid() = admin_id OR
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'admin-dev'))
    );

CREATE POLICY "Users can create conversations" ON conversations
    FOR INSERT WITH CHECK (
        auth.uid() = student_id OR 
        auth.uid() = mentor_id OR
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'admin-dev', 'mentor'))
    );

CREATE POLICY "Users can update their own conversations" ON conversations
    FOR UPDATE USING (
        auth.uid() = student_id OR 
        auth.uid() = mentor_id OR 
        auth.uid() = admin_id OR
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'admin-dev'))
    );

-- 5. Update RLS Policies for messages
-- Drop existing policies
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON messages;
DROP POLICY IF EXISTS "Users can send messages in their conversations" ON messages;
DROP POLICY IF EXISTS "Users can mark received messages as read" ON messages;

-- Create new policies that include admin
CREATE POLICY "Users can view messages in their conversations" ON messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM conversations c 
            WHERE c.id = messages.conversation_id 
            AND (
                c.student_id = auth.uid() OR 
                c.mentor_id = auth.uid() OR 
                c.admin_id = auth.uid() OR
                EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'admin-dev'))
            )
        )
    );

CREATE POLICY "Users can send messages in their conversations" ON messages
    FOR INSERT WITH CHECK (
        auth.uid() = sender_id AND
        EXISTS (
            SELECT 1 FROM conversations c 
            WHERE c.id = conversation_id 
            AND (
                c.student_id = auth.uid() OR 
                c.mentor_id = auth.uid() OR 
                c.admin_id = auth.uid() OR
                EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'admin-dev'))
            )
        )
    );

CREATE POLICY "Users can mark received messages as read" ON messages
    FOR UPDATE USING (
        auth.uid() != sender_id AND
        EXISTS (
            SELECT 1 FROM conversations c 
            WHERE c.id = messages.conversation_id 
            AND (
                c.student_id = auth.uid() OR 
                c.mentor_id = auth.uid() OR 
                c.admin_id = auth.uid()
            )
        )
    );

-- 6. Create index for admin_id
CREATE INDEX IF NOT EXISTS idx_conversations_admin_id ON conversations(admin_id);
