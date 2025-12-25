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
    const { data: application } = await supabase
        .from('mentor_applications')
        .select('*')
        .eq('user_id', user.id)
        .single()

    if (!application) {
        return redirect('/dashboard/mentor/onboarding')
    }

    if (application.status === 'pending') {
        return (
            <div className="min-h-screen bg-accent text-white">
                <div className="max-w-7xl mx-auto px-8 lg:px-12 py-20">
                    <div className="max-w-md mx-auto text-center">
                        <div className="w-20 h-20 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-6">
                            <svg className="w-10 h-10 text-white animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <h1 className="text-4xl lg:text-6xl font-serif leading-none tracking-tight mb-8">Application Pending</h1>
                        <p className="text-gray-300 text-lg mb-8 leading-relaxed">
                            Thank you for applying, <span className="text-white font-semibold">{profile.full_name}</span>! Our team is currently reviewing your profile. We&apos;ll notify you via email once you&apos;re approved.
                        </p>
                        <div className="p-4 bg-gray-700 rounded-2xl text-gray-200 text-sm font-medium">
                            Estimated review time: 24-48 hours
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    if (application.status === 'dismissed') {
        return (
            <div className="min-h-screen bg-accent text-white">
                <div className="max-w-7xl mx-auto px-8 lg:px-12 py-20">
                    <div className="max-w-md mx-auto text-center">
                        <div className="w-20 h-20 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-6">
                            <svg className="w-10 h-10 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </div>
                        <h1 className="text-4xl lg:text-6xl font-serif leading-none tracking-tight mb-8">Application Dismissed</h1>
                        <p className="text-gray-300 text-lg mb-8">
                            We appreciate your interest. Unfortunately, your application has not been approved at this time.
                        </p>
                        <button className="text-gray-200 font-semibold hover:text-white transition-colors border-b border-gray-600 hover:border-white">Contact Support for Details</button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-accent text-white">
            <div className="max-w-7xl mx-auto px-8 lg:px-12 py-20">
                <header className="mb-16">
                    <h1 className="text-6xl lg:text-[100px] font-serif leading-none tracking-tight">
                        Mentor Dashboard
                    </h1>
                    <p className="mt-6 text-gray-300 text-xl font-light">Welcome back, {profile.full_name}!</p>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="p-8 bg-gray-800/50 backdrop-blur-sm rounded-3xl border border-gray-700 hover:bg-gray-800/70 transition-all group">
                        <div className="w-14 h-14 bg-gray-700 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                            </svg>
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-2">Student Requests</h2>
                        <p className="text-gray-300 mb-6 leading-relaxed">Incoming mentorship requests from students looking for guidance.</p>
                        <button className="text-gray-200 font-bold group-hover:translate-x-2 transition-transform inline-flex items-center hover:text-white">
                            View Requests <span className="ml-2">→</span>
                        </button>
                    </div>

                    <div className="p-8 bg-gray-800/50 backdrop-blur-sm rounded-3xl border border-gray-700 hover:bg-gray-800/70 transition-all group">
                        <div className="w-14 h-14 bg-gray-700 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-2">Earnings</h2>
                        <p className="text-gray-300 mb-6 leading-relaxed">Track your hourly sessions, completed milestones, and payouts.</p>
                        <button className="text-gray-200 font-bold group-hover:translate-x-2 transition-transform inline-flex items-center hover:text-white">
                            View Wallet <span className="ml-2">→</span>
                        </button>
                    </div>

                    <div className="p-8 bg-gray-700 rounded-3xl border border-gray-600">
                        <h2 className="text-2xl font-bold text-white mb-4">Complete Profile</h2>
                        <p className="text-gray-300 mb-8">Maximize your visibility to students by completing your full profile details.</p>
                        <button className="bg-white text-gray-900 font-bold py-3 px-6 rounded-2xl transition-all hover:bg-gray-200">
                            Edit Profile
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
