import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import AdminMessagesContent from './admin-messages-content'

export default async function AdminMessagesPage() {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        return redirect('/login')
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (!profile || (profile.role !== 'admin' && profile.role !== 'admin-dev')) {
        return redirect('/dashboard')
    }

    // Fetch ALL conversations with student and mentor info
    const { data: conversations } = await supabase
        .from('conversations')
        .select(`
            id,
            student_id,
            mentor_id,
            last_message_at,
            created_at,
            student:profiles!conversations_student_id_fkey (
                id,
                full_name,
                email
            ),
            mentor:profiles!conversations_mentor_id_fkey (
                id,
                full_name,
                email
            )
        `)
        .order('last_message_at', { ascending: false })

    // Get message counts and last message for each conversation
    const processedConversations = await Promise.all(
        (conversations || []).map(async (conv: any) => {
            // Get message count
            const { count: messageCount } = await supabase
                .from('messages')
                .select('*', { count: 'exact', head: true })
                .eq('conversation_id', conv.id)

            // Get last message
            const { data: lastMessage } = await supabase
                .from('messages')
                .select('content, sender_id, created_at')
                .eq('conversation_id', conv.id)
                .order('created_at', { ascending: false })
                .limit(1)
                .single()

            return {
                id: conv.id,
                student_id: conv.student_id,
                mentor_id: conv.mentor_id,
                last_message_at: conv.last_message_at,
                created_at: conv.created_at,
                student: {
                    id: conv.student?.id || conv.student_id,
                    full_name: conv.student?.full_name || 'Unknown Student',
                    email: conv.student?.email || ''
                },
                mentor: {
                    id: conv.mentor?.id || conv.mentor_id,
                    full_name: conv.mentor?.full_name || 'Unknown Mentor',
                    email: conv.mentor?.email || ''
                },
                message_count: messageCount || 0,
                last_message: lastMessage || null
            }
        })
    )

    return (
        <div className="max-w-7xl mx-auto">
            <header className="mb-8">
                <h1 className="text-4xl font-extrabold text-accent tracking-tight">
                    Messages Overview
                </h1>
                <p className="mt-2 text-gray-500 text-lg">
                    Monitor and intervene in student-mentor conversations
                </p>
            </header>

            <AdminMessagesContent
                conversations={processedConversations}
                currentUserId={user.id}
            />
        </div>
    )
}
