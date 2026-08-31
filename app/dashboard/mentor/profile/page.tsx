import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import MentorProfileContent from './mentor-profile-content'

export default async function MentorProfilePage() {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        return redirect('/login')
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role, full_name, email')
        .eq('id', user.id)
        .single()

    if (!profile || (profile.role !== 'mentor' && profile.role !== 'admin-dev')) {
        return redirect('/dashboard')
    }

    const { data: mentor } = await supabase
        .from('mentors')
        .select('*')
        .eq('id', user.id)
        .single()

    if (!mentor) {
        return redirect('/dashboard/mentor/onboarding')
    }

    // ---- Stats ----------------------------------------------------------
    // Sessions completed
    const { count: sessionsCompleted } = await supabase
        .from('sessions')
        .select('*', { count: 'exact', head: true })
        .eq('mentor_id', user.id)
        .eq('status', 'completed')

    // Active students (current assignments)
    const { count: activeStudents } = await supabase
        .from('student_mentor_assignments')
        .select('*', { count: 'exact', head: true })
        .eq('mentor_id', user.id)
        .eq('is_current', true)

    // Student ratings are deliberately not surfaced here. Feedback about a
    // mentor is admin-only: the mentor pool is small enough that a single low
    // score is identifying, and showing mentors their own average changes how
    // students' comments get handled. Admins see it on the mentor detail page.

    return (
        <div className="max-w-3xl mx-auto">
            <header className="mb-10">
                <h1 className="text-3xl sm:text-4xl font-extrabold text-accent tracking-tight">My Profile</h1>
                <p className="mt-3 text-gray-500 text-lg">
                    Keep your details up to date — this is what students and the team see.
                </p>
            </header>

            <MentorProfileContent
                email={profile.email || ''}
                fullName={profile.full_name || ''}
                mentor={mentor as any}
                stats={{
                    sessionsCompleted: sessionsCompleted || 0,
                    activeStudents: activeStudents || 0,
                }}
            />
        </div>
    )
}
