import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import MyMentorsContent from './my-mentors-content'

export default async function MyMentorsPage() {
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

    if (!profile || (profile.role !== 'student' && profile.role !== 'admin-dev')) {
        return redirect('/dashboard')
    }

    // Fetch unique mentors from sessions (both active and completed)
    const { data: sessions } = await supabase
        .from('sessions')
        .select(`
            id,
            status,
            scheduled_at,
            created_at,
            mentor_id,
            mentor:profiles!sessions_mentor_id_fkey (
                id,
                full_name
            )
        `)
        .eq('student_id', user.id)
        .in('status', ['active', 'completed'])
        .order('created_at', { ascending: false })

    // Get unique mentor IDs
    const mentorIds = [...new Set((sessions || []).map((s: any) => s.mentor_id))]

    // Fetch mentor details
    const { data: mentorDetails } = mentorIds.length > 0
        ? await supabase
            .from('mentors')
            .select('id, bio, expertise, photo_url')
            .in('id', mentorIds)
        : { data: [] }

    const mentorDetailsMap = new Map(
        (mentorDetails || []).map((m: any) => [m.id, m])
    )

    // Process mentors with their session info
    const mentorMap = new Map<string, any>()

    for (const session of sessions || []) {
        const mentorId = session.mentor_id
        if (!mentorMap.has(mentorId)) {
            const details = mentorDetailsMap.get(mentorId) || {}
            mentorMap.set(mentorId, {
                id: mentorId,
                full_name: (session.mentor as any)?.full_name || 'Mentor',
                bio: details.bio || null,
                expertise: details.expertise || [],
                photo_url: details.photo_url || null,
                has_active_session: session.status === 'active',
                total_sessions: 0,
                last_session_at: null
            })
        }

        const mentor = mentorMap.get(mentorId)!
        mentor.total_sessions++
        if (session.status === 'active') {
            mentor.has_active_session = true
        }
        if (session.scheduled_at && (!mentor.last_session_at || new Date(session.scheduled_at) > new Date(mentor.last_session_at))) {
            mentor.last_session_at = session.scheduled_at
        }
    }

    const mentors = Array.from(mentorMap.values())

    // Split into active (connected) and past mentors
    const activeMentors = mentors.filter(m => m.has_active_session)
    const pastMentors = mentors.filter(m => !m.has_active_session)

    return (
        <div className="max-w-4xl mx-auto">
            <header className="mb-10">
                <h1 className="text-4xl font-extrabold text-accent tracking-tight">
                    My Mentors
                </h1>
                <p className="mt-3 text-gray-500 text-lg">
                    Your allocated and connected mentors
                </p>
            </header>

            <MyMentorsContent
                activeMentors={activeMentors}
                pastMentors={pastMentors}
                currentUserId={user.id}
            />
        </div>
    )
}
