import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { LogoutButton } from '@/components/logout-button'
import { Hourglass } from '@phosphor-icons/react/ssr'
import MentorOverview from './mentor-overview'
import { loadMentorOverview } from './overview-data'

export default async function MentorDashboard() {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        return redirect('/login')
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

    if (!profile || (profile.role !== 'mentor' && profile.role !== 'admin-dev')) {
        return redirect('/dashboard')
    }

    // Check application status
    const { data: mentor } = await supabase
        .from('mentors')
        .select('*')
        .eq('id', user.id)
        .single()

    if (!mentor || mentor.status === 'details_required') {
        return redirect('/dashboard/mentor/onboarding')
    }

    if (mentor.status === 'pending_approval') {
        return (
            <div
                data-hide-floating-ui
                className="flex flex-col items-center justify-center py-20 text-center"
            >
                <div className="mb-6 grid size-20 place-items-center rounded-full bg-tint-amber text-tint-amber-foreground">
                    <Hourglass weight="duotone" className="size-10" />
                </div>
                <h1 className="mb-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">Application pending</h1>
                <p className="mb-8 max-w-md text-lg leading-relaxed text-muted-foreground text-pretty">
                    Thank you for applying, <span className="font-semibold">{profile.full_name}</span>! Our team is currently reviewing your profile. We&apos;ll notify you via email once you&apos;re approved.
                </p>
                <div className="rounded-full bg-tint-blue px-4 py-2 text-sm font-medium text-tint-blue-foreground">
                    Estimated review time: 24-48 hours
                </div>
                <div className="mt-8">
                    <LogoutButton />
                </div>
            </div>
        )
    }

    // The mentor's own signed-in client: row-level security keeps it to
    // their own sessions, requests and payouts.
    return <MentorOverview data={await loadMentorOverview(supabase, user.id)} />
}
