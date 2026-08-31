import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import AdminMessagesContent from './admin-messages-content-v2'
import { formatGroupTitle, loadGroupMembers } from '@/lib/chat-groups'

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

    // Fetch ALL conversations with student and mentor info (incl. support threads)
    const { data: conversations } = await supabase
        .from('conversations')
        .select(`
            id,
            student_id,
            mentor_id,
            type,
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

    const groupIds = (conversations || [])
        .filter((conv: { type?: string | null }) => conv.type === 'group')
        .map((conv: { id: string }) => conv.id)
    const membersByConversation = await loadGroupMembers(supabase, groupIds)

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
                .select('content, sender_id, created_at, attachments')
                .eq('conversation_id', conv.id)
                .order('created_at', { ascending: false })
                .limit(1)
                .single()

            const isSupport = conv.type === 'support'
            const isMentorSupport = conv.type === 'mentor_support'
            const isGroup = conv.type === 'group'
            const members = isGroup ? membersByConversation.get(conv.id) || [] : undefined
            const groupTitle = isGroup ? formatGroupTitle(members || []) : null

            return {
                id: conv.id,
                student_id: conv.student_id,
                mentor_id: conv.mentor_id,
                type: (conv.type || 'mentor') as 'mentor' | 'support' | 'mentor_support' | 'group',
                last_message_at: conv.last_message_at || conv.created_at || new Date().toISOString(),
                created_at: conv.created_at || new Date().toISOString(),
                student: {
                    id: conv.student?.id || conv.student_id || (isGroup ? 'group' : 'support'),
                    full_name: isGroup
                        ? groupTitle || 'Group chat'
                        : isMentorSupport
                          ? 'Access Oxbridge (Claire)'
                          : (conv.student?.full_name || 'Unknown Student'),
                    email: conv.student?.email || '',
                },
                mentor: {
                    id: conv.mentor?.id || conv.mentor_id || (isGroup ? 'group' : 'support'),
                    full_name: isGroup
                        ? 'Group chat'
                        : isSupport
                          ? 'Help & Support'
                          : (conv.mentor?.full_name || 'Unknown Mentor'),
                    email: conv.mentor?.email || '',
                },
                members,
                message_count: messageCount || 0,
                last_message: lastMessage ? {
                    ...lastMessage,
                    created_at: lastMessage.created_at || new Date().toISOString()
                } : null
            }
        })
    )

    return (
        // Same full-bleed geometry as the student and mentor threads; see the
        // student page for why the mobile bottom padding survives.
        <div className="flex flex-col -mx-4 md:-mx-10 -mt-4 md:-mt-10 md:-mb-10 h-[calc(100dvh-160px)] md:h-screen">
            <header className="shrink-0 px-4 md:px-10 pt-4 md:pt-5 pb-4">
                <h1 className="text-2xl sm:text-3xl font-bold text-accent tracking-tight">
                    Messages Overview
                </h1>
            </header>

            <AdminMessagesContent
                conversations={processedConversations}
                currentUserId={user.id}
            />
        </div>
    )
}
