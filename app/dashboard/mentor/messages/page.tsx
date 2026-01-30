import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import MessagesContent from '@/components/chat/messages-content'

export default async function MentorMessagesPage() {
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

    if (!profile || (profile.role !== 'mentor' && profile.role !== 'admin-dev')) {
        return redirect('/dashboard')
    }

    // Fetch conversations with student and admin (Senior Strategist) info and last message
    const { data: conversations } = await supabase
        .from('conversations')
        .select(`
            id,
            student_id,
            mentor_id,
            admin_id,
            last_message_at,
            student:profiles!conversations_student_id_fkey (
                id,
                full_name
            ),
            admin:profiles!conversations_admin_id_fkey (
                id,
                full_name
            )
        `)
        .eq('mentor_id', user.id)
        .order('last_message_at', { ascending: false })

    // Fetch all connected students (those with active/completed sessions)
    const { data: connectedStudents } = await supabase
        .from('sessions')
        .select(`
            student_id,
            student:profiles!sessions_student_id_fkey (
                id,
                full_name
            )
        `)
        .eq('mentor_id', user.id)
        .in('status', ['active', 'completed'])

    // Deduplicate students and check for existing conversations
    const studentMap = new Map()
    const existingConvStudentIds = new Set((conversations || []).map((c: any) => c.student_id))

        ; (connectedStudents || []).forEach((session: any) => {
            if (session.student && !studentMap.has(session.student_id)) {
                studentMap.set(session.student_id, {
                    id: session.student.id,
                    full_name: session.student.full_name,
                    photo_url: null, // Students don't have photos
                    hasExistingConversation: existingConvStudentIds.has(session.student_id),
                    conversationId: (conversations || []).find((c: any) => c.student_id === session.student_id)?.id
                })
            }
        })

    const connectedUsers = Array.from(studentMap.values())

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
                    id: conv.student?.id || conv.student_id,
                    full_name: conv.student?.full_name || 'Student',
                    photo_url: null // Students don't have photos in current schema
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
                    Chat with your students in real-time
                </p>
            </header>

            <MessagesContent
                conversations={processedConversations}
                currentUserId={user.id}
                connectedUsers={connectedUsers}
                userRole="mentor"
            />
        </div>
    )
}
