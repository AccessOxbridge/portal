import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

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
            <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-20 h-20 bg-accent/10 rounded-full flex items-center justify-center mb-6">
                    <svg className="w-10 h-10 text-accent animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
                <h1 className="text-4xl font-bold text-accent mb-6">Application Pending</h1>
                <p className="text-gray-600 text-lg max-w-md mb-8 leading-relaxed">
                    Thank you for applying, <span className="font-semibold">{profile.full_name}</span>! Our team is currently reviewing your profile. We&apos;ll notify you via email once you&apos;re approved.
                </p>
                <div className="px-6 py-3 bg-rich-beige-accent rounded-2xl text-accent text-sm font-bold">
                    Estimated review time: 24-48 hours
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

    // Fetch active sessions for this mentor
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

    return (
        <div className="space-y-12">
            <header>
                <h1 className="text-5xl font-extrabold text-accent tracking-tight">
                    Mentor Dashboard
                </h1>
                <p className="mt-4 text-gray-500 text-xl font-medium">Welcome back, {profile.full_name}!</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="p-8 bg-white rounded-[32px] border border-gray-100 shadow-xl shadow-gray-200/50 hover:shadow-indigo-100 transition-all group relative">
                    {pendingRequestsCount ? (
                        <div className="absolute top-6 right-6 bg-red-500 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center animate-bounce shadow-lg shadow-red-200">
                            {pendingRequestsCount}
                        </div>
                    ) : null}
                    <div className="w-14 h-14 bg-rich-beige-accent rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-inner">
                        <svg className="w-7 h-7 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Student Requests</h2>
                    <p className="text-gray-500 mb-6 leading-relaxed text-sm">Incoming mentorship requests from students looking for guidance.</p>
                    <a href="/dashboard/mentor/requests" className="text-accent font-bold group-hover:translate-x-2 transition-transform inline-flex items-center">
                        View Requests <span className="ml-2">→</span>
                    </a>
                </div>

                {activeSessions && activeSessions.length > 0 && (
                    <div className="p-8 bg-green-50 rounded-[32px] border border-green-100 shadow-xl shadow-green-200/50">
                        <div className="w-14 h-14 bg-green-100 rounded-2xl flex items-center justify-center mb-6">
                            <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">Active Sessions</h2>
                        <div className="space-y-3">
                            {activeSessions.map((session: any) => (
                                <div key={session.id} className="p-4 bg-white rounded-2xl border border-green-100">
                                    <p className="font-semibold text-gray-900 mb-2">
                                        Session with {(session.student as any)?.full_name || 'Student'}
                                    </p>
                                    {session.zoom_start_url ? (
                                        <a
                                            href={session.zoom_start_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition-colors"
                                        >
                                            🎥 Start Zoom Meeting
                                        </a>
                                    ) : (
                                        <span className="text-gray-500 text-sm">Zoom link unavailable</span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="p-8 bg-white rounded-[32px] border border-gray-100 shadow-xl shadow-gray-200/50 hover:shadow-indigo-100 transition-all group">
                    <div className="w-14 h-14 bg-rich-beige-accent rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-inner">
                        <svg className="w-7 h-7 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Earnings</h2>
                    <p className="text-gray-500 mb-6 leading-relaxed text-sm">Track your hourly sessions, completed milestones, and payouts.</p>
                    <button className="text-accent font-bold group-hover:translate-x-2 transition-transform inline-flex items-center">
                        View Wallet <span className="ml-2">→</span>
                    </button>
                </div>

                <div className="p-8 bg-accent rounded-[32px] shadow-2xl shadow-accent/30 flex flex-col justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-white mb-4">Complete Profile</h2>
                        <p className="text-white/70 mb-8 text-sm leading-relaxed">Maximize your visibility to students by completing your full profile details.</p>
                    </div>
                    <button className="bg-rich-amber-accent text-accent font-bold py-4 px-6 rounded-2xl transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-black/10">
                        Edit Profile
                    </button>
                </div>
            </div>
        </div>
    )
}
