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

    // Fetch pending approvals count
    const { count: pendingCount } = await supabase
        .from('mentor_applications')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending')

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <header className="mb-12">
                <h1 className="text-4xl font-extrabold text-gray-900">Admin Dashboard</h1>
                <p className="mt-2 text-gray-500 text-xl font-medium">Welcome back, {profile.full_name}</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                <Link href="/dashboard/admin/approvals" className="p-8 bg-white shadow-xl rounded-3xl border border-gray-100 hover:shadow-indigo-100 transition-all group relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4">
                        {pendingCount !== null && pendingCount > 0 && (
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white animate-bounce">
                                {pendingCount}
                            </span>
                        )}
                    </div>
                    <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                        <svg className="w-7 h-7 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">User Approval</h2>
                    <p className="text-gray-500 mb-6 leading-relaxed">Review and approve new mentor applications.</p>
                    <div className="text-indigo-600 font-bold group-hover:translate-x-2 transition-transform inline-flex items-center">
                        View Applications <span className="ml-2">→</span>
                    </div>
                </Link>

                <div className="p-8 bg-white shadow-xl rounded-3xl border border-gray-100 hover:shadow-green-100 transition-all group">
                    <div className="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center mb-6">
                        <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Platform Overview</h2>
                    <p className="text-gray-500 mb-6 leading-relaxed">Monitor students and mentors activity globally.</p>
                </div>

                <div className="p-8 bg-white shadow-xl rounded-3xl border border-gray-100 hover:shadow-purple-100 transition-all group">
                    <div className="w-14 h-14 bg-purple-50 rounded-2xl flex items-center justify-center mb-6">
                        <svg className="w-7 h-7 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Payouts</h2>
                    <p className="text-gray-500 mb-6 leading-relaxed">Manage fortnightly mentor payments and invoices.</p>
                </div>
            </div>
        </div>
    )
}
