import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import StudentMentorProfileContent from './mentor-profile-content'

interface PageProps {
    params: Promise<{ id: string }>
}

export default async function StudentMentorProfilePage({ params }: PageProps) {
    const { id: mentorId } = await params
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

    // Authorization: a student can only view mentors they are (or were) assigned.
    const { data: assignments } = await supabase
        .from('student_mentor_assignments')
        .select('mentor_id, is_current, created_at, ended_at')
        .eq('student_id', user.id)
        .eq('mentor_id', mentorId)
        .order('created_at', { ascending: false })

    if (!assignments || assignments.length === 0) {
        return redirect('/dashboard/student/mentors')
    }

    const isCurrent = assignments.some((a) => a.is_current)

    const { data: mentor } = await supabase
        .from('mentors')
        .select(`
            id,
            bio,
            expertise,
            university,
            photo_url,
            cv_url,
            timezone,
            created_at,
            profile:profiles!mentors_id_fkey ( full_name )
        `)
        .eq('id', mentorId)
        .single()

    if (!mentor) {
        return redirect('/dashboard/student/mentors')
    }

    // Session stats between this student and this mentor.
    const { data: sessions } = await supabase
        .from('sessions')
        .select('status, scheduled_at')
        .eq('student_id', user.id)
        .eq('mentor_id', mentorId)

    let totalSessions = 0
    let hasActiveSession = false
    let lastSessionAt: string | null = null

    for (const s of sessions || []) {
        totalSessions++
        if ((s as any).status === 'active') hasActiveSession = true
        const scheduledAt = (s as any).scheduled_at
        if (scheduledAt && (!lastSessionAt || new Date(scheduledAt) > new Date(lastSessionAt))) {
            lastSessionAt = scheduledAt
        }
    }

    const mentorProfile = Array.isArray(mentor.profile) ? mentor.profile[0] : mentor.profile

    return (
        <div className="max-w-4xl mx-auto">
            <StudentMentorProfileContent
                mentor={{
                    id: mentor.id,
                    full_name: mentorProfile?.full_name || 'Mentor',
                    bio: mentor.bio,
                    expertise: mentor.expertise || [],
                    university: mentor.university,
                    photo_url: mentor.photo_url,
                    cv_url: mentor.cv_url,
                    created_at: mentor.created_at,
                }}
                isCurrent={isCurrent}
                totalSessions={totalSessions}
                hasActiveSession={hasActiveSession}
                lastSessionAt={lastSessionAt}
                currentUserId={user.id}
            />
        </div>
    )
}
