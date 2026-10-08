import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { StripeOnboardingButton } from '@/components/dashboard/stripe-onboarding-button'
import { LogoutButton } from '@/components/logout-button'
import { formatDateInTz, formatTimeInTz } from '@/lib/timezone'
import { ArrowRight, CalendarBlank, CheckCircle, CurrencyGbp, Hourglass, Users, VideoCamera } from '@phosphor-icons/react/ssr'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/utils/lib'

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

    // Fetch pending requests count
    const { count: pendingRequestsCount } = await supabase
        .from('mentorship_requests')
        .select('*', { count: 'exact', head: true })
        .eq('mentor_id', user.id)
        .eq('status', 'pending')

    // Fetch active sessions for this mentor (upcoming/ongoing only)
    const now = new Date().toISOString()
    const { data: activeSessions } = await supabase
        .from('sessions')
        .select(`
            *,
            student:profiles!sessions_student_id_fkey (
                full_name
            )
        `)
        .eq('mentor_id', user.id)
        .eq('status', 'active')
        .or(`scheduled_at.gte.${now},scheduled_at.is.null`)
        .order('scheduled_at', { ascending: true })
        .limit(10)

    return (
        <div className="space-y-8">
            <header>
                <h1 className="text-3xl font-semibold tracking-tight text-foreground text-balance sm:text-4xl">
                    Mentor dashboard
                </h1>
                <p className="mt-2 text-lg text-muted-foreground">Welcome back, {profile.full_name}!</p>
            </header>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-5">
                <div className="border border-transparent group relative rounded-card bg-card p-6 shadow-border transition-shadow duration-150 ease-out hover:shadow-border-hover">
                    {pendingRequestsCount ? (
                        <div className="absolute top-5 right-5 inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-destructive px-1.5 text-xs font-semibold text-white tabular-nums">
                            {pendingRequestsCount}
                        </div>
                    ) : null}
                    <div className="mb-5 grid size-12 place-items-center rounded-full bg-tint-blue text-tint-blue-foreground">
                        <Users weight="duotone" className="size-6" />
                    </div>
                    <h2 className="mb-1.5 text-lg font-semibold text-foreground">Student requests</h2>
                    <p className="mb-5 text-sm leading-relaxed text-muted-foreground text-pretty">Incoming mentorship requests from students looking for guidance.</p>
                    <a href="/dashboard/mentor/requests" className={linkArrow}>
                        View requests <ArrowRight weight="bold" className="size-4 transition-transform duration-150 ease-out group-hover:translate-x-0.5" />
                    </a>
                </div>

                {activeSessions && activeSessions.length > 0 && (
                    <div className="rounded-card bg-tint-green p-6 ring-1 ring-tint-green-foreground/15">
                        <div className="mb-5 grid size-12 place-items-center rounded-full bg-card text-tint-green-foreground">
                            <VideoCamera weight="duotone" className="size-6" />
                        </div>
                        <h2 className="mb-3 text-lg font-semibold text-foreground">Active sessions</h2>
                        <div className="space-y-2.5">
                            {activeSessions.map((session: any) => (
                                <div key={session.id} className="border border-transparent rounded-card bg-card p-4 shadow-border">
                                    <p className="mb-1 font-medium text-foreground">
                                        {(session.student as any)?.full_name || 'Student'}
                                    </p>
                                    {session.scheduled_at && (
                                        <p className="mb-3 flex items-center gap-1.5 text-sm text-muted-foreground tabular-nums">
                                            <CalendarBlank className="size-4" />
                                            {formatDateInTz(session.scheduled_at, mentor.timezone, { day: 'numeric', month: 'short' })}, {formatTimeInTz(session.scheduled_at, mentor.timezone)}
                                        </p>
                                    )}
                                    {session.zoom_meeting_id || session.zoom_start_url ? (
                                        <a
                                            href={`/api/sessions/${session.id}/start`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className={cn(buttonVariants({ size: 'sm' }), 'w-full bg-success hover:bg-success/90')}
                                        >
                                            <VideoCamera weight="fill" />
                                            Start at {session.scheduled_at ? formatTimeInTz(session.scheduled_at, mentor.timezone) : 'Session'}
                                        </a>
                                    ) : (
                                        <span className="text-sm text-muted-foreground">Zoom link unavailable</span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="border border-transparent group relative rounded-card bg-card p-6 shadow-border transition-shadow duration-150 ease-out hover:shadow-border-hover">
                    <div className="mb-5 grid size-12 place-items-center rounded-full bg-tint-green text-tint-green-foreground">
                        <CurrencyGbp weight="duotone" className="size-6" />
                    </div>
                    <h2 className="mb-1.5 text-lg font-semibold text-foreground">Earnings and payouts</h2>
                    {mentor.payouts_enabled ? (
                        <>
                            <p className="mb-2 text-sm leading-relaxed text-muted-foreground text-pretty">Track your sessions & view your earnings.</p>
                            <div className="mb-5 flex items-center gap-1.5 text-sm font-medium text-success">
                                <CheckCircle weight="fill" className="size-4" />
                                Connected to Stripe
                            </div>
                            <a href="/dashboard/mentor/payouts" className={linkArrow}>
                                View payouts <ArrowRight weight="bold" className="size-4 transition-transform duration-150 ease-out group-hover:translate-x-0.5" />
                            </a>
                        </>
                    ) : (
                        <>
                            <p className="mb-5 text-sm leading-relaxed text-muted-foreground text-pretty">Complete your onboarding to set up payment and start receiving payouts.</p>
                            <a href="/dashboard/mentor/training" className={linkArrow}>
                                Complete onboarding <ArrowRight weight="bold" className="size-4 transition-transform duration-150 ease-out group-hover:translate-x-0.5" />
                            </a>
                        </>
                    )}
                </div>

                {/* The one navy card: the next thing to do. */}
                <div className="flex flex-col justify-between rounded-card bg-primary p-6 text-primary-foreground shadow-overlay">
                    <div>
                        <h2 className="mb-2 text-lg font-semibold">Complete onboarding</h2>
                        <p className="mb-6 text-sm leading-relaxed text-primary-foreground/70 text-pretty">Finish your training, sign contract, and complete your profile to start receiving allocations.</p>
                    </div>
                    <a href="/dashboard/mentor/training" className={cn(buttonVariants(), 'w-full bg-rich-amber-accent text-primary hover:bg-rich-amber-accent/90')}>
                        Go to training
                    </a>
                </div>
            </div>
        </div>
    )
}

const linkArrow = 'inline-flex items-center gap-1.5 text-sm font-medium text-brand'
