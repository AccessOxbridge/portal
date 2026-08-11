import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import MessagesContent from '@/components/chat/v2/messages-content'

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
            type,
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
                .select('content, sender_id, attachments')
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

            // Admin<->mentor "support" thread: rendered with the exact same logic
            // as the student's Help & Support view — the mentor sees "Claire
            // Marlowe / Senior Strategist" (the Access Oxbridge team).
            const isMentorSupport = conv.type === 'mentor_support'

            return {
                id: conv.id,
                student_id: conv.student_id,
                mentor_id: conv.mentor_id,
                admin_id: conv.admin_id,
                type: conv.type as 'mentor' | 'support' | 'mentor_support',
                last_message_at: conv.last_message_at,
                other_user: isMentorSupport
                    ? {
                        id: conv.admin_id || 'support',
                        full_name: 'Claire Marlowe',
                        photo_url: '/logo.png',
                        role_label: 'Senior Strategist',
                    }
                    : {
                        id: conv.student?.id || conv.student_id,
                        full_name: conv.student?.full_name || 'Student',
                        photo_url: null // Students don't have photos in current schema
                    },
                admin_user: (!isMentorSupport && conv.admin) ? {
                    id: conv.admin.id,
                    full_name: 'Senior Strategist'
                } : null,
                last_message: lastMessage || null,
                unread_count: count || 0
            }
        })
    )

    return (
        // See the student page for the full-bleed geometry and why the mobile
        // bottom padding survives while the desktop one does not.
        <div className="flex flex-col -mx-4 md:-mx-10 -mt-4 md:-mt-10 md:-mb-10 h-[calc(100dvh-160px)] md:h-screen">
            <header className="shrink-0 px-4 md:px-10 pt-4 md:pt-5 pb-4">
                <h1 className="text-2xl sm:text-3xl font-bold text-accent tracking-tight">
                    Messages
                </h1>
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
