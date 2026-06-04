import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { getGreetingName } from '@/utils/lib'
import DashboardShell from '@/components/dashboard/dashboard-shell'
import StudentCreditsProvider from '@/components/dashboard/student-credits-provider'
import HelpSupportButton from '@/components/dashboard/help-support-button'
import { headers } from 'next/headers'

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const supabase = await createClient()
    const headerList = await headers();

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        return redirect('/login')
    }

    let { data: profile } = await supabase
        .from('profiles')
        .select(`
            full_name, 
            role,
            credits,
            mentors (
                status,
                bio,
                photo_url,
                payouts_enabled,
                training_completed_at,
                quiz_completed_at,
                contract_signed_at,
                dbs_certificate_url,
                background_check_confirmed_at,
                profile_completed_at
            )
        `)
        .eq('id', user.id)
        .single()

    // User exists in auth but no profile returned (either missing or initial select failed e.g. join).
    if (!profile) {
        const { error: insertError } = await supabase.from('profiles').insert({
            id: user.id,
            full_name: user.user_metadata?.full_name ?? user.email?.split('@')[0] ?? 'User',
            role: 'student',
            email: user.email ?? '',
        })
        if (insertError) {
            // 23505 = unique_violation: profile already exists, initial select likely failed (e.g. join)
            if (insertError.code === '23505') {
                const { data: existingProfile } = await supabase
                    .from('profiles')
                    .select('full_name, role, credits')
                    .eq('id', user.id)
                    .single()
                if (existingProfile) {
                    let mentorsData: { status: string | null; bio: string | null; photo_url: string | null; payouts_enabled: boolean | null; training_completed_at: string | null; quiz_completed_at: string | null; contract_signed_at: string | null; dbs_certificate_url: string | null; background_check_confirmed_at: string | null; profile_completed_at: string | null } | null = null
                    if (existingProfile.role === 'mentor' || existingProfile.role === 'admin-dev') {
                        const { data: mentorRow } = await supabase
                            .from('mentors')
                            .select('status, bio, photo_url, payouts_enabled, training_completed_at, quiz_completed_at, contract_signed_at, dbs_certificate_url, background_check_confirmed_at, profile_completed_at')
                            .eq('id', user.id)
                            .single()
                        mentorsData = mentorRow
                    }
                    profile = { ...existingProfile, mentors: mentorsData } as NonNullable<typeof profile>
                }
            }
            if (!profile) {
                return redirect(`/error?message=${encodeURIComponent('Your account has no profile. Please contact support.')}`)
            }
        } else {
            const { data: newProfile } = await supabase
                .from('profiles')
                .select(`
                    full_name, 
                    role,
                    credits,
                    mentors (
                        status,
                        bio,
                        photo_url,
                        payouts_enabled,
                        training_completed_at,
                        quiz_completed_at,
                        contract_signed_at,
                        dbs_certificate_url,
                        background_check_confirmed_at,
                        profile_completed_at
                    )
                `)
                .eq('id', user.id)
                .single()
            if (!newProfile) {
                return redirect(`/error?message=${encodeURIComponent('Could not load your profile.')}`)
            }
            profile = newProfile
        }
    }

    if (!profile) {
        return redirect(`/error?message=${encodeURIComponent('Could not load your profile.')}`)
    }

    let showSidebar = true
    let onboardingIncomplete = false

    if (profile.role === 'mentor' || profile.role === 'admin-dev') {
        const mentor = (profile as any).mentors
        const status = mentor?.status

        // Hide sidebar if:
        // 1. Role is mentor and no record exists yet (onboarding)
        // 2. Status is 'details_required' or 'pending_approval'
        if (profile.role === 'mentor' && (!mentor || status === 'details_required' || status === 'pending_approval')) {
            showSidebar = false
        }



        // Check if mentor training/onboarding is incomplete
        if (mentor && showSidebar) {
            // Check training completion - if any of these are missing, training is incomplete
            const trainingComplete = !!mentor.training_completed_at
            const quizComplete = !!mentor.quiz_completed_at
            const contractSigned = !!mentor.contract_signed_at
            const dbsComplete = !!mentor.dbs_certificate_url || !!mentor.background_check_confirmed_at
            const paymentSetup = !!mentor.payouts_enabled
            const profileComplete = !!mentor.profile_completed_at || (!!mentor.bio && !!mentor.photo_url)

            onboardingIncomplete = !trainingComplete || !quizComplete || !contractSigned || !dbsComplete || !paymentSetup || !profileComplete
            // expose trainingComplete to sidebar via local variable (passed below)
            ;(profile as any).mentors.trainingCompleteFlag = trainingComplete
        }
    }

    const isStudent = profile.role === 'student' || (profile.role === 'admin-dev' && headerList.get('referer')?.includes('student'))
    const isMentor = profile.role === 'mentor' || (profile.role === 'admin-dev' && headerList.get('referer')?.includes('mentor'))

    // Calculate pending reports count and pending requests count for mentors
    let pendingReportsCount = 0
    let pendingRequestsCount = 0

    if (isMentor && showSidebar) {
        const nowIso = new Date().toISOString()
        const now = new Date()

        // Get all past/ended sessions for this mentor (for reports)
        const { data: sessions } = await supabase
            .from('sessions')
            .select('id, scheduled_at, status, zoom_meeting_status')
            .eq('mentor_id', user.id)
            .or(`scheduled_at.lt.${nowIso},zoom_meeting_status.eq.ended,status.eq.completed`)

        if (sessions && sessions.length > 0) {
            const sessionIds = sessions.map(s => s.id)

            // Get submitted reports
            const { data: submittedReports } = await supabase
                .from('form_responses')
                .select('session_id')
                .eq('respondent_id', user.id)
                .eq('form_type', 'mentor_report')
                .in('session_id', sessionIds)

            const submittedSessionIds = new Set(submittedReports?.map(r => r.session_id) || [])

            // Count sessions that need reports
            pendingReportsCount = sessions.filter(session => {
                const isPast = session.scheduled_at && new Date(session.scheduled_at) < now
                const isEnded = session.zoom_meeting_status === 'ended' || session.status === 'completed'
                return (isPast || isEnded) && !submittedSessionIds.has(session.id)
            }).length
        }

        // Pending student requests (mentorship_requests awaiting mentor response)
        const { count: requestsCount } = await supabase
            .from('mentorship_requests')
            .select('*', { count: 'exact', head: true })
            .eq('mentor_id', user.id)
            .eq('status', 'pending')
        pendingRequestsCount = requestsCount ?? 0
    }

    // Calculate student help count for admins
    let studentHelpCount = 0
    const isAdmin = profile.role === 'admin' || profile.role === 'admin-dev'
    if (isAdmin) {
        const { count } = await supabase
            .from('user_issues')
            .select('*', { count: 'exact', head: true })
            .eq('issue_type', 'student_help')
            .eq('status', 'open')

        studentHelpCount = count || 0
    }

    const sidebarProps = {
        role: profile.role || 'student',
        userName:
            profile.role === 'student' || profile.role === 'admin-dev'
                ? getGreetingName(
                      profile.full_name,
                      user.user_metadata?.full_name as string | undefined,
                      user.email,
                      'User'
                  )
                : profile.full_name || user.email?.split('@')[0] || 'User',
        userId: user.id,
        pendingReportsCount,
        pendingRequestsCount,
        onboardingIncomplete,
        trainingComplete: ((profile as any).mentors?.trainingCompleteFlag) || false,
        studentHelpCount,
    }

    const dashboardShell = (
        <DashboardShell
            showSidebar={showSidebar}
            sidebarProps={sidebarProps}
            footer={isStudent ? <HelpSupportButton /> : undefined}
        >
            {children}
        </DashboardShell>
    )

    if (isStudent) {
        return (
            <StudentCreditsProvider initialCredits={(profile as any).credits ?? 0}>
                {dashboardShell}
            </StudentCreditsProvider>
        )
    }

    return dashboardShell
}
