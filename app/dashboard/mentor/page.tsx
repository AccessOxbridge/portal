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
            <div className="min-h-[80vh] flex items-center justify-center p-8 text-center">
                <div className="max-w-md bg-white p-10 rounded-3xl shadow-2xl border border-indigo-50">
                    <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <svg className="w-10 h-10 text-indigo-600 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <h1 className="text-3xl font-extrabold text-gray-900 mb-4">Application Pending</h1>
                    <p className="text-gray-500 text-lg mb-8 leading-relaxed">
                        Thank you for applying, <span className="text-indigo-600 font-semibold">{profile.full_name}</span>! Our team is currently reviewing your profile. We'll notify you via email once you're approved.
                    </p>
                    <div className="p-4 bg-indigo-50 rounded-2xl text-indigo-700 text-sm font-medium">
                        Estimated review time: 24-48 hours
                    </div>
                </div>
            </div>
        )
    }

    if (application.status === 'dismissed') {
        return (
            <div className="min-h-[80vh] flex items-center justify-center p-8 text-center">
                <div className="max-w-md bg-white p-10 rounded-3xl shadow-2xl border border-red-50">
                    <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </div>
                    <h1 className="text-3xl font-extrabold text-gray-900 mb-4">Application Dismissed</h1>
                    <p className="text-gray-500 text-lg mb-8">
                        We appreciate your interest. Unfortunately, your application has not been approved at this time.
                    </p>
                    <button className="text-indigo-600 font-semibold hover:underline">Contact Support for Details</button>
                </div>
            </div>
        )
    }

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <header className="mb-12">
                <h1 className="text-4xl font-extrabold text-gray-900 bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
                    Mentor Dashboard
                </h1>
                <p className="mt-2 text-gray-500 text-xl font-medium">Welcome back, {profile.full_name}!</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="p-8 bg-white shadow-xl rounded-3xl border border-gray-100 hover:shadow-indigo-100 transition-all group">
                    <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                        <svg className="w-7 h-7 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Student Requests</h2>
                    <p className="text-gray-500 mb-6 leading-relaxed">Incoming mentorship requests from students looking for guidance.</p>
                    <button className="text-indigo-600 font-bold group-hover:translate-x-2 transition-transform inline-flex items-center">
                        View Requests <span className="ml-2">→</span>
                    </button>
                </div>

                <div className="p-8 bg-white shadow-xl rounded-3xl border border-gray-100 hover:shadow-purple-100 transition-all group">
                    <div className="w-14 h-14 bg-purple-50 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                        <svg className="w-7 h-7 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Earnings</h2>
                    <p className="text-gray-500 mb-6 leading-relaxed">Track your hourly sessions, completed milestones, and payouts.</p>
                    <button className="text-purple-600 font-bold group-hover:translate-x-2 transition-transform inline-flex items-center">
                        View Wallet <span className="ml-2">→</span>
                    </button>
                </div>

                <div className="p-8 bg-gradient-to-br from-indigo-600 to-purple-700 shadow-2xl rounded-3xl text-white">
                    <h2 className="text-2xl font-bold mb-4">Complete Profile</h2>
                    <p className="text-indigo-100 mb-8 opacity-90">Maximize your visibility to students by completing your full profile details.</p>
                    <button className="bg-white text-indigo-600 font-bold py-3 px-6 rounded-2xl shadow-lg hover:shadow-indigo-800/20 transition-all">
                        Edit Profile
                    </button>
                </div>
            </div>
        </div>
    )
}
