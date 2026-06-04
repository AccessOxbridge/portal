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

    // The student's mentor history comes from admin assignments.
    const { data: assignments } = await supabase
        .from('student_mentor_assignments')
        .select('mentor_id, is_current, created_at, ended_at')
        .eq('student_id', user.id)
        .order('created_at', { ascending: false })

    const currentAssignment = (assignments || []).find((a: any) => a.is_current) || null
    const currentMentorId = currentAssignment?.mentor_id || null

    // Past mentors = distinct previously-assigned mentors that are not the current one.
    const pastMentorIds = [
        ...new Set(
            (assignments || [])
                .filter((a: any) => !a.is_current && a.mentor_id && a.mentor_id !== currentMentorId)
                .map((a: any) => a.mentor_id as string)
        ),
    ]

    const allMentorIds = [...new Set([currentMentorId, ...pastMentorIds].filter(Boolean) as string[])]

    // Mentor profile details
    const { data: mentorDetails } = allMentorIds.length > 0
        ? await supabase
            .from('mentors')
            .select('id, bio, expertise, photo_url')
            .in('id', allMentorIds)
        : { data: [] }

    const detailsMap = new Map((mentorDetails || []).map((m: any) => [m.id, m]))

    const { data: mentorProfiles } = allMentorIds.length > 0
        ? await supabase
            .from('profiles')
            .select('id, full_name')
            .in('id', allMentorIds)
        : { data: [] }

    const profileMap = new Map((mentorProfiles || []).map((p: any) => [p.id, p]))

    // Session stats per mentor (for the card details / active badge)
    const { data: sessions } = allMentorIds.length > 0
        ? await supabase
            .from('sessions')
            .select('mentor_id, status, scheduled_at')
            .eq('student_id', user.id)
            .in('mentor_id', allMentorIds)
        : { data: [] }

    const statsMap = new Map<string, { total: number; active: boolean; last: string | null }>()
    for (const s of sessions || []) {
        const mid = (s as any).mentor_id as string
        const entry = statsMap.get(mid) || { total: 0, active: false, last: null }
        entry.total++
        if ((s as any).status === 'active') entry.active = true
        const scheduledAt = (s as any).scheduled_at
        if (scheduledAt && (!entry.last || new Date(scheduledAt) > new Date(entry.last))) {
            entry.last = scheduledAt
        }
        statsMap.set(mid, entry)
    }

    const buildMentor = (mentorId: string) => {
        const details = detailsMap.get(mentorId) || {}
        const stats = statsMap.get(mentorId) || { total: 0, active: false, last: null }
        return {
            id: mentorId,
            full_name: profileMap.get(mentorId)?.full_name || 'Mentor',
            bio: details.bio || null,
            expertise: details.expertise || [],
            photo_url: details.photo_url || null,
            has_active_session: stats.active,
            total_sessions: stats.total,
            last_session_at: stats.last,
        }
    }

    const activeMentors = currentMentorId ? [buildMentor(currentMentorId)] : []
    const pastMentors = pastMentorIds.map(buildMentor)

    return (
        <div className="max-w-4xl mx-auto">
            <header className="mb-10">
                <h1 className="text-4xl font-extrabold text-accent tracking-tight">
                    My Mentor
                </h1>
                <p className="mt-3 text-gray-500 text-lg">
                    Your assigned mentor and your mentorship history
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
