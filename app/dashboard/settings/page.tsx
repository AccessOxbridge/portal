import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import SettingsContent from './settings-content'

export default async function SettingsPage() {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        return redirect('/login')
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, role, email, updated_at')
        .eq('id', user.id)
        .single()

    if (!profile) {
        return redirect('/error?message=Could not load your profile.')
    }

    const role = profile.role
    const isStudent = role === 'student' || role === 'admin-dev'

    // Timezone lives on student_profiles for students, mentors for mentors.
    let timezone: string | null = null
    if (isStudent) {
        const { data } = await supabase
            .from('student_profiles')
            .select('timezone')
            .eq('id', user.id)
            .maybeSingle()
        timezone = data?.timezone ?? null
    } else {
        const { data } = await supabase
            .from('mentors')
            .select('timezone')
            .eq('id', user.id)
            .maybeSingle()
        timezone = (data as { timezone?: string | null } | null)?.timezone ?? null
    }

    return (
        <SettingsContent
            email={profile.email || user.email || ''}
            fullName={profile.full_name || 'User'}
            role={role}
            createdAt={user.created_at}
            timezone={timezone}
        />
    )
}
