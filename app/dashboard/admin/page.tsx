import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function AdminDashboard() {
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

    if (!profile || (profile.role !== 'admin' && profile.role !== 'admin-dev')) {
        return redirect('/dashboard')
    }

    // Fetch Aggregated Statistics
    const [
        { count: mentorsCount },
        { count: studentsCount },
        { count: sessionsCount },
        { count: requestsCount },
        { count: pendingApprovalsCount }
    ] = await Promise.all([
        supabase.from('mentors').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'student'),
        supabase.from('sessions').select('*', { count: 'exact', head: true }),
        supabase.from('mentorship_requests').select('*', { count: 'exact', head: true }),
        supabase.from('mentors').select('*', { count: 'exact', head: true }).eq('status', 'pending_approval')
    ])

    const stats = [
        { label: 'Total Mentors', value: mentorsCount || 0, change: '+12%', color: 'text-blue-600' },
        { label: 'Total Students', value: studentsCount || 0, change: '+18%', color: 'text-green-600' },
        { label: 'Sessions Taken', value: sessionsCount || 0, change: '+24%', color: 'text-purple-600' },
        { label: 'Requests', value: requestsCount || 0, change: '+8%', color: 'text-amber-600' },
    ]

    return (
        <div className="space-y-8 max-w-6xl mx-auto">
            <header className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Home</h1>
                    <p className="text-gray-500 mt-1">Welcome back, {profile?.full_name?.split(' ')[0] || 'Admin'}</p>
                </div>
                {/* <div className="flex gap-3">
                    <button className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm">
                        Download Report
                    </button>
                    <button className="px-4 py-2 bg-accent text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity shadow-lg shadow-accent/10">
                        Add New Mentor
                    </button>
                </div> */}
            </header>

            {/* Alert / Notice */}
            <div className="bg-gray-50 border border-gray-100 rounded-[24px] p-6 flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-white border border-gray-100 flex items-center justify-center shrink-0 shadow-sm">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <div>
                    <h3 className="font-semibold text-gray-900">Payment processing is not yet available</h3>
                    <p className="text-gray-500 text-sm mt-1">Complete all steps below to start accepting payments from customers</p>
                </div>
            </div>

            {/* Action Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Link href="/dashboard/admin/approvals" className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm hover:shadow-md transition-all group flex flex-col h-full">
                    <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                        <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 mb-2">User Approvals</h2>
                    <p className="text-gray-500 text-sm mb-8 grow">Review and manage mentor onboarding applications. ({pendingApprovalsCount || 0} pending)</p>
                    <span className="w-full py-3 bg-gray-50 group-hover:bg-accent group-hover:text-white text-gray-600 text-center rounded-xl text-sm font-semibold transition-colors">
                        View Applications
                    </span>
                </Link>

                <Link href="/dashboard/admin/blog" className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm hover:shadow-md transition-all group flex flex-col h-full">
                    <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                        <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10l2 2h2a2 2 0 012 2v10a2 2 0 01-2 2z" /></svg>
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 mb-2">Blog Management</h2>
                    <p className="text-gray-500 text-sm mb-8 grow">Create and manage content for the Oxford-Bridge network.</p>
                    <span className="w-full py-3 bg-gray-50 group-hover:bg-accent group-hover:text-white text-gray-600 text-center rounded-xl text-sm font-semibold transition-colors">
                        Manage Articles
                    </span>
                </Link>

                <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm hover:shadow-md transition-all group flex flex-col h-full">
                    <div className="w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                        <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 mb-2">Analytics Overview</h2>
                    <p className="text-gray-500 text-sm mb-8 grow">Monitor student engagement and mentor response rates.</p>
                    <span className="w-full py-3 bg-blue-600 text-white text-center rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200">
                        View Analytics
                    </span>
                </div>
            </div>

            {/* Detailed Stats Section */}
            <div className="bg-white border border-gray-100 rounded-[32px] p-8 shadow-sm">
                <div className="flex items-center justify-between mb-8">
                    <h3 className="text-lg font-bold text-gray-900">Platform Performance</h3>
                    <select className="bg-gray-50 border border-gray-100 rounded-lg px-3 py-1.5 text-xs font-medium text-gray-600 focus:outline-none">
                        <option>Last 30 days</option>
                        <option>Last 7 days</option>
                        <option>All time</option>
                    </select>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                    {stats.map((stat) => (
                        <div key={stat.label} className="space-y-2">
                            <span className="text-sm font-medium text-gray-400">{stat.label}</span>
                            <div className="flex items-baseline gap-2">
                                <span className="text-3xl font-bold text-gray-900">{stat.value}</span>
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-gray-50 ${stat.color}`}>{stat.change}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
