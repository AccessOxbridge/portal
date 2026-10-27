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
        .from('profiles_private')
        .select('full_name, role, email, photo_url')
        .eq('id', user.id)
        .single()

    if (!profile) {
        return redirect('/error?message=Could not load your profile.')
    }

    // Every profile row has a role; the view's generated type is nullable.
    const role = profile.role as NonNullable<typeof profile.role>
    const isStudent = role === 'student' || role === 'admin-dev'

    // Timezone lives on student_profiles for students, mentors for mentors.
    // Parents have neither: their pages use the linked child's time zone.
    let timezone: string | null = null
    if (role === 'parent' || role === 'sales') {
        timezone = null
    } else if (isStudent) {
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

    const isAdmin = role === 'admin' || role === 'admin-dev'

    // Own sign-ins. RLS already scopes this to the caller, but the filter keeps
    // the admin policy from widening it for an admin looking at their own tile.
    const { data: ownEvents } = await supabase
        .from('login_events')
        .select('id, created_at, ip, user_agent, status')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20)

    // The global feed, for admins only. The email comes off the row itself
    // rather than a join so failed attempts against an address with no account
    // still say what was tried.
    const { data: allEvents } = isAdmin
        ? await supabase
              .from('login_events')
              .select('id, created_at, ip, user_agent, status, email')
              .order('created_at', { ascending: false })
              .limit(50)
        : { data: null }

    return (
        <SettingsContent
            loginEvents={ownEvents ?? []}
            allLoginEvents={allEvents ?? null}
            email={profile.email || user.email || ''}
            fullName={profile.full_name || 'User'}
            role={role}
            createdAt={user.created_at}
            timezone={timezone}
            userId={user.id}
            photoUrl={profile.photo_url ?? null}
        />
    )
}
