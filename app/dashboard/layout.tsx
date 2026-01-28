import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import Sidebar from '@/components/dashboard/sidebar'
import CreditsFloatingButton from '@/components/dashboard/credits-floating-button'
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

    const { data: profile } = await supabase
        .from('profiles')
        .select(`
            full_name, 
            role,
            credits,
            mentors (
                status
            )
        `)
        .eq('id', user.id)
        .single()

    if (!profile) {
        return redirect('/login')
    }

    let showSidebar = true
    if (profile.role === 'mentor' || profile.role === 'admin-dev') {
        const mentor = (profile as any).mentors
        const status = mentor?.status

        // Hide sidebar if:
        // 1. Role is mentor and no record exists yet (onboarding)
        // 2. Status is 'details_required' or 'pending_approval'
        if (profile.role === 'mentor' && (!mentor || status === 'details_required' || status === 'pending_approval')) {
            showSidebar = false
        }
    }

    const isStudent = profile.role === 'student' || (profile.role === 'admin-dev' && headerList.get('referer')?.includes('student'))
    const isMentor = profile.role === 'mentor' || (profile.role === 'admin-dev' && headerList.get('referer')?.includes('mentor'))

    // Calculate pending reports count for mentors
    let pendingReportsCount = 0
    if (isMentor && showSidebar) {
        const now = new Date().toISOString()

        // Get all past/ended sessions for this mentor
        const { data: sessions } = await supabase
            .from('sessions')
            .select('id, scheduled_at, status, zoom_meeting_status')
            .eq('mentor_id', user.id)
            .or(`scheduled_at.lt.${now},zoom_meeting_status.eq.ended,status.eq.completed`)

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
                const isPast = session.scheduled_at && new Date(session.scheduled_at) < new Date()
                const isEnded = session.zoom_meeting_status === 'ended' || session.status === 'completed'
                return (isPast || isEnded) && !submittedSessionIds.has(session.id)
            }).length
        }
    }

    return (
        <div className="flex min-h-screen">
            {/* Sidebar with fixed width */}
            {showSidebar && (
                <Sidebar
                    // we should not default to student! error handling - TODO  
                    role={profile.role || 'student'}
                    userName={profile.full_name || user.email?.split('@')[0] || 'User'}
                    userId={user.id}
                    pendingReportsCount={pendingReportsCount}
                />
            )}

            {/* Main Content Area */}
            <main className={`flex-1 ${showSidebar ? 'ml-64' : ''} min-h-screen bg-[#F9FAFB]`}>
                <div className="max-w-[1600px] mx-auto p-6 md:p-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    {children}
                </div>
            </main>

            {/* Floating Credits Button for Students */}
            {isStudent && (
                <CreditsFloatingButton initialCredits={(profile as any).credits || 0} />
            )}
        </div>
    )
}
