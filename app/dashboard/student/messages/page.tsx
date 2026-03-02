import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import MessagesContent from '@/components/chat/messages-content'

export default async function StudentMessagesPage({
    searchParams
}: {
    searchParams: Promise<{ mentor?: string }>
}) {
    const supabase = await createClient()
    const { mentor: mentorId } = await searchParams

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

    if (!profile || (profile.role !== 'student' && profile.role !== 'admin-dev')) {
        return redirect('/dashboard')
    }

    // Fetch conversations with mentor and admin (Senior Strategist) info and last message
    const { data: conversations } = await supabase
        .from('conversations')
        .select(`
            id,
            student_id,
            mentor_id,
            admin_id,
            last_message_at,
            mentor:profiles!conversations_mentor_id_fkey (
                id,
                full_name,
                mentors (
                    photo_url
                )
            ),
            admin:profiles!conversations_admin_id_fkey (
                id,
                full_name
            )
        `)
        .eq('student_id', user.id)
        .order('last_message_at', { ascending: false })

    // Fetch all connected mentors (those with active/completed sessions)
    const { data: connectedMentors } = await supabase
        .from('sessions')
        .select(`
            mentor_id,
            mentor:profiles!sessions_mentor_id_fkey (
                id,
                full_name,
                mentors (
                    photo_url
                )
            )
        `)
        .eq('student_id', user.id)
        .in('status', ['active', 'completed'])

    // Deduplicate mentors and check for existing conversations
    const mentorMap = new Map()
    const existingConvMentorIds = new Set((conversations || []).map((c: any) => c.mentor_id))

        ; (connectedMentors || []).forEach((session: any) => {
            if (session.mentor && !mentorMap.has(session.mentor_id)) {
                mentorMap.set(session.mentor_id, {
                    id: session.mentor.id,
                    full_name: session.mentor.full_name,
                    photo_url: session.mentor.mentors?.[0]?.photo_url || null,
                    hasExistingConversation: existingConvMentorIds.has(session.mentor_id),
                    conversationId: (conversations || []).find((c: any) => c.mentor_id === session.mentor_id)?.id
                })
            }
        })

    const connectedUsers = Array.from(mentorMap.values())

    // Get last message for each conversation and unread count
    const processedConversations = await Promise.all(
        (conversations || []).map(async (conv: any) => {
            // Get last message
            const { data: lastMessage } = await supabase
                .from('messages')
                .select('content, sender_id')
                .eq('conversation_id', conv.id)
                .order('created_at', { ascending: false })
                .limit(1)
                .single()

            // Get unread count
            const { count } = await supabase
                .from('messages')
                .select('*', { count: 'exact', head: true })
                .eq('conversation_id', conv.id)
                .eq('is_read', false)
                .neq('sender_id', user.id)

            return {
                id: conv.id,
                student_id: conv.student_id,
                mentor_id: conv.mentor_id,
                admin_id: conv.admin_id,
                last_message_at: conv.last_message_at,
                other_user: {
                    id: conv.mentor?.id || conv.mentor_id,
                    full_name: conv.mentor?.full_name || 'Mentor',
                    photo_url: conv.mentor?.mentors?.[0]?.photo_url || null
                },
                admin_user: conv.admin ? {
                    id: conv.admin.id,
                    full_name: 'Senior Strategist'
                } : null,
                last_message: lastMessage || null,
                unread_count: count || 0
            }
        })
    )

    return (
        <div className="max-w-6xl mx-auto h-[calc(100vh-120px)]">
            <header className="mb-6">
                <h1 className="text-4xl font-extrabold text-accent tracking-tight">
                    Messages
                </h1>
                <p className="mt-2 text-gray-500 text-lg">
                    Chat with your mentors in real-time
                </p>
            </header>

            <MessagesContent
                conversations={processedConversations}
                currentUserId={user.id}
                connectedUsers={connectedUsers}
                userRole="student"
                initialMentorId={mentorId}
            />
        </div>
    )
}
