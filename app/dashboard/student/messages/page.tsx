import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import MessagesContent from '@/components/chat/v2/messages-content'

export default async function StudentMessagesPage({
    searchParams
}: {
    searchParams: Promise<{ mentor?: string; support?: string }>
}) {
    const supabase = await createClient()
    const { mentor: mentorId, support } = await searchParams

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

    // 1. Current assigned mentors (if any)
    const { data: assignments } = await supabase
        .from('student_mentor_assignments')
        .select('mentor_id')
        .eq('student_id', user.id)
        .eq('is_current', true)

    const assignedMentorIds = [...new Set((assignments || []).map((a: any) => a.mentor_id as string).filter(Boolean))]

    // 2. Ensure the Help & Support conversation exists (student <-> admin).
    const { data: existingSupport } = await supabase
        .from('conversations')
        .select('id')
        .eq('student_id', user.id)
        .eq('type', 'support')
        .maybeSingle()

    if (!existingSupport) {
        const { data: adminProfile } = await supabase
            .from('profiles')
            .select('id')
            .in('role', ['admin', 'admin-dev'])
            .limit(1)
            .maybeSingle()

        await supabase.from('conversations').insert({
            student_id: user.id,
            mentor_id: null,
            admin_id: adminProfile?.id || null,
            type: 'support',
        })
    }

    // 3. Ensure a mentor conversation exists for each currently assigned mentor.
    if (assignedMentorIds.length > 0) {
        const { data: existingMentorConvs } = await supabase
            .from('conversations')
            .select('mentor_id')
            .eq('student_id', user.id)
            .eq('type', 'mentor')
            .in('mentor_id', assignedMentorIds)

        const existingMentorIds = new Set((existingMentorConvs || []).map((c: any) => c.mentor_id))
        const missingMentorIds = assignedMentorIds.filter((id) => !existingMentorIds.has(id))

        if (missingMentorIds.length > 0) {
            await supabase.from('conversations').insert(
                missingMentorIds.map((mentorId) => ({
                    student_id: user.id,
                    mentor_id: mentorId,
                    type: 'mentor',
                }))
            )
        }
    }

    // 4. Load the (now-ensured) conversations.
    const { data: conversations } = await supabase
        .from('conversations')
        .select(`
            id,
            student_id,
            mentor_id,
            admin_id,
            type,
            last_message_at,
            mentor:profiles!conversations_mentor_id_fkey (
                id,
                full_name
            )
        `)
        .eq('student_id', user.id)
        .order('last_message_at', { ascending: false })

    // Mentor photos live on the `mentors` table (keyed by the profile id).
    const mentorIds = [
        ...new Set(
            (conversations || [])
                .map((c: any) => c.mentor_id)
                .filter(Boolean) as string[]
        ),
    ]

    const { data: mentorPhotos } = mentorIds.length > 0
        ? await supabase
            .from('mentors')
            .select('id, photo_url')
            .in('id', mentorIds)
        : { data: [] }

    const photoMap = new Map((mentorPhotos || []).map((m: any) => [m.id, m.photo_url]))

    // 5. Enrich each conversation with last message + unread count.
    const processedConversations = await Promise.all(
        (conversations || []).map(async (conv: any) => {
            const { data: lastMessage } = await supabase
                .from('messages')
                .select('content, sender_id, attachments')
                .eq('conversation_id', conv.id)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle()

            const { count } = await supabase
                .from('messages')
                .select('*', { count: 'exact', head: true })
                .eq('conversation_id', conv.id)
                .eq('is_read', false)
                .neq('sender_id', user.id)

            const isSupport = conv.type === 'support'

            return {
                id: conv.id,
                student_id: conv.student_id,
                mentor_id: conv.mentor_id,
                admin_id: conv.admin_id,
                type: conv.type as 'mentor' | 'support',
                last_message_at: conv.last_message_at,
                other_user: isSupport
                    ? {
                        id: conv.admin_id || 'support',
                        full_name: 'Claire Marlowe',
                        photo_url: '/logo.png',
                        role_label: 'Senior Strategist',
                    }
                    : {
                        id: conv.mentor?.id || conv.mentor_id,
                        full_name: conv.mentor?.full_name || 'Mentor',
                        photo_url: photoMap.get(conv.mentor_id) || null,
                        role_label: null,
                    },
                admin_user: null,
                last_message: lastMessage || null,
                unread_count: count || 0,
            }
        })
    )

    // Support chats first, then mentor.
    processedConversations.sort((a, b) => {
        if (a.type === b.type) return 0
        return a.type === 'support' ? -1 : 1
    })

    return (
        // Full-bleed. The shell's padding is cancelled so the panes reach the
        // edges — including the bottom on desktop (md:-mb-10), where that
        // padding existed only to clear the mobile tab bar and so was dead
        // space. On phones pb-24 is deliberately left alone: the tab bar is
        // fixed there and the composer has to stay clear of it.
        //
        // Heights: phones are 100dvh less the 64px MobileTopBar and the 96px
        // pb-24; desktop is 100vh less the 80px DesktopTopBar.
        <div className="flex flex-col -mx-4 md:-mx-10 -mt-4 md:-mt-6 md:-mb-10 h-[calc(100dvh-160px)] md:h-[calc(100vh-80px)]">
            {/* One header, then the panes own the rest of the height. The
                subtitle is gone deliberately: the thread already says what
                this page is, and three stacked headers before any content
                was the main thing making this screen feel cluttered. */}
            <header className="shrink-0 px-4 md:px-10 pt-4 md:pt-5 pb-4">
                <h1 className="text-2xl sm:text-3xl font-bold text-accent tracking-tight">
                    Messages
                </h1>
            </header>

            <MessagesContent
                conversations={processedConversations}
                currentUserId={user.id}
                connectedUsers={[]}
                userRole="student"
                initialMentorId={mentorId}
                initialSupport={support === '1'}
                allowNewConversation={false}
            />
        </div>
    )
}
