import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { getGreetingName } from '@/utils/lib'
import DashboardShell from '@/components/dashboard/dashboard-shell'
import StudentCreditsProvider from '@/components/dashboard/student-credits-provider'
import HelpSupportButton from '@/components/dashboard/help-support-button'
import type { StudentBookingProfile } from '@/components/dashboard/book-session-modal'
import type { RateableSession } from '@/components/dashboard/rate-session-modal'
import { feedbackPromptWindowStart } from '@/config/feedback.config'
import { getMentorPhotoUrl } from '@/lib/mentor-photo'
import { selectStudentMilestone } from '@/lib/student-milestones'
import { selectDueSatisfactionSurvey, type DueSatisfactionSurvey } from '@/lib/student-satisfaction'
import SatisfactionBanner from '@/components/dashboard/satisfaction-banner'
import type { StudentMilestone } from '@/components/dashboard/milestone-modal'
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
            photo_url,
            mentors (
                status,
                bio,
                photo_url,
                payouts_enabled,
                questionnaire_completed_at,
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
        // Never trust admin/client/admin-dev from user_metadata. The only
        // self-serve role we will honour here is mentor, so a missing-profile
        // fallback cannot mint staff accounts and cannot demote a mentor.
        const metadataRole = user.user_metadata?.role
        const fallbackRole = metadataRole === 'mentor' ? 'mentor' : 'student'

        const { error: insertError } = await supabase.from('profiles').insert({
            id: user.id,
            full_name: user.user_metadata?.full_name ?? user.email?.split('@')[0] ?? 'User',
            role: fallbackRole,
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
                    let mentorsData: { status: string | null; bio: string | null; photo_url: string | null; payouts_enabled: boolean | null; questionnaire_completed_at: string | null; contract_signed_at: string | null; dbs_certificate_url: string | null; background_check_confirmed_at: string | null; profile_completed_at: string | null } | null = null
                    if (existingProfile.role === 'mentor' || existingProfile.role === 'admin-dev') {
                        const { data: mentorRow } = await supabase
                            .from('mentors')
                            .select('status, bio, photo_url, payouts_enabled, questionnaire_completed_at, contract_signed_at, dbs_certificate_url, background_check_confirmed_at, profile_completed_at')
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
                    photo_url,
                    mentors (
                        status,
                        bio,
                        photo_url,
                        payouts_enabled,
                        questionnaire_completed_at,
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



        // Check if mentor onboarding is incomplete
        if (mentor && showSidebar) {
            // Check onboarding completion - if any of these are missing, onboarding is incomplete
            const questionnaireComplete = !!mentor.questionnaire_completed_at
            const contractSigned = !!mentor.contract_signed_at
            const dbsComplete = !!mentor.dbs_certificate_url || !!mentor.background_check_confirmed_at
            const paymentSetup = !!mentor.payouts_enabled
            const profileComplete = !!mentor.profile_completed_at || (!!mentor.bio && !!mentor.photo_url)

            onboardingIncomplete = !questionnaireComplete || !contractSigned || !dbsComplete || !paymentSetup || !profileComplete
            // expose onboarding completion to sidebar via local variable (passed below)
            ;(profile as any).mentors.trainingCompleteFlag = questionnaireComplete
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

    // Student booking data for the global "Book a session" modal (mounted in
    // StudentCreditsProvider) so the sidebar CTA works on every dashboard page,
    // not just the dashboard and sessions pages. Mirrors the gating used by the
    // sessions page: a complete profile AND an admin-assigned mentor.
    let bookingProfile: StudentBookingProfile | null = null
    let canBook = false
    let bookingMentors: { id: string; name: string }[] = []
    if (isStudent) {
        const { data: academicProfile } = await supabase
            .from('student_profiles')
            .select('*')
            .eq('id', user.id)
            .single()

        const { data: currentAssignments } = await supabase
            .from('student_mentor_assignments')
            .select('mentor_id, mentor:profiles!student_mentor_assignments_mentor_id_fkey (full_name)')
            .eq('student_id', user.id)
            .eq('is_current', true)

        bookingMentors = (currentAssignments || []).map((a: any) => ({
            id: a.mentor_id,
            name: a.mentor?.full_name || 'Mentor',
        }))
        const hasMentors = bookingMentors.length > 0
        const profileComplete = !!(
            academicProfile?.is_complete &&
            academicProfile?.school_name &&
            academicProfile?.timezone &&
            Array.isArray(academicProfile?.subjects) &&
            academicProfile.subjects.length > 0
        )
        canBook = profileComplete && hasMentors

        if (academicProfile) {
            bookingProfile = {
                school_name: academicProfile.school_name || '',
                school_country: academicProfile.school_country || '',
                curriculum: academicProfile.curriculum || '',
                curriculum_other: academicProfile.curriculum_other || undefined,
                subjects: (academicProfile.subjects as { name: string; predicted_grade: string }[] | null) || [],
                target_university: academicProfile.target_university || '',
                timezone: academicProfile.timezone || '',
                interests: academicProfile.interests || '',
                extracurriculars: academicProfile.extracurriculars || '',
                additional_notes: academicProfile.additional_notes || undefined,
            }
        }
    }

    // The one recently-completed session this student should be asked to rate,
    // for the popup mounted in StudentCreditsProvider. Newest first: the
    // freshest session is the one they can actually remember. We ask about at
    // most one at a time — a student with several unrated sessions gets the
    // most recent, and the rest are simply never volunteered.
    //
    // `feedbackPromptWindowStart()` is the later of "7 days ago" and the
    // go-live cutoff, which is what keeps the pre-existing backlog (one student
    // had 22 unrated sessions) from ambushing anyone.
    let rateableSession: RateableSession | null = null
    if (isStudent) {
        const { data: recentSessions } = await supabase
            .from('sessions')
            .select('id, scheduled_at, mentor:profiles!sessions_mentor_id_fkey (full_name, photo_url:mentors(photo_url))')
            .eq('student_id', user.id)
            .eq('status', 'completed')
            .gte('scheduled_at', feedbackPromptWindowStart())
            .lte('scheduled_at', new Date().toISOString())
            .order('scheduled_at', { ascending: false })
            .limit(10)

        const candidateIds = (recentSessions || []).map((s) => s.id)

        if (candidateIds.length > 0) {
            // Exclude anything already rated or already dismissed. Two small
            // lookups rather than a join: the candidate set is capped at 10.
            const [{ data: rated }, { data: dismissed }] = await Promise.all([
                supabase
                    .from('form_responses')
                    .select('session_id')
                    .eq('form_type', 'student_feedback')
                    .in('session_id', candidateIds),
                supabase
                    .from('session_feedback_prompts')
                    .select('session_id')
                    .in('session_id', candidateIds),
            ])

            const handled = new Set([
                ...(rated || []).map((r) => r.session_id),
                ...(dismissed || []).map((d) => d.session_id),
            ])

            const next = (recentSessions || []).find((s) => !handled.has(s.id))
            if (next) {
                rateableSession = {
                    id: next.id,
                    mentorName: (next as any).mentor?.full_name || 'your mentor',
                    mentorPhotoUrl: getMentorPhotoUrl((next as any).mentor),
                    scheduledAt: next.scheduled_at,
                }
            }
        }
    }

    // The session-count milestone (1st, 5th, 10th, 20th, 50th, 100th) this
    // student has just reached and not yet been congratulated for. Independent
    // of the feedback prompt above on purpose: a student who closes the tab
    // without answering the rating popup still gets their moment, and the
    // celebration is recorded separately so it happens exactly once. The popup
    // itself queues behind the rating popup, in StudentCreditsProvider.
    let milestone: StudentMilestone | null = null
    if (isStudent) {
        milestone = await selectStudentMilestone(supabase, user.id)
    }

    // The every-4-sessions satisfaction check-in, if this student owes one.
    // Unlike the two popups above, this one never opens by itself: it surfaces
    // as a banner pinned to the top of every dashboard page (topSlot below),
    // and the banner is what persists until the survey is actually filled in.
    // No go-live cutoff here on purpose — see config/satisfaction.config.ts.
    let satisfactionSurvey: DueSatisfactionSurvey | null = null
    if (isStudent) {
        satisfactionSurvey = await selectDueSatisfactionSurvey(supabase, user.id)
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
        // Mentors keep their photo on `mentors`; everyone else — students,
        // admins — carries it on `profiles`.
        photoUrl: (profile as any).mentors?.photo_url || profile.photo_url || null,
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
            topSlot={isStudent ? <SatisfactionBanner /> : undefined}
        >
            {children}
        </DashboardShell>
    )

    if (isStudent) {
        return (
            <StudentCreditsProvider
                initialCredits={(profile as any).credits ?? 0}
                bookingProfile={canBook ? bookingProfile : null}
                canBook={canBook}
                mentors={bookingMentors}
                rateableSession={rateableSession}
                milestone={milestone}
                satisfactionSurvey={satisfactionSurvey}
            >
                {dashboardShell}
            </StudentCreditsProvider>
        )
    }

    return dashboardShell
}
