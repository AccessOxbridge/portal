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
        .from('mentors')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending_approval')

    return (
        <div className="space-y-12">
            <header>
                <h1 className="text-5xl font-extrabold text-accent tracking-tight">Admin Dashboard</h1>
                <p className="mt-4 text-gray-500 text-xl font-medium">Welcome back, {profile.full_name}</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                <Link href="/dashboard/admin/approvals" className="p-8 bg-white shadow-xl shadow-gray-200/50 rounded-[40px] border border-gray-100 hover:shadow-indigo-100 transition-all group relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8">
                        {pendingCount !== null && pendingCount > 0 && (
                            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-red-500 text-xs font-black text-white shadow-lg shadow-red-200 animate-bounce">
                                {pendingCount}
                            </span>
                        )}
                    </div>
                    <div className="w-16 h-16 bg-rich-beige-accent rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform shadow-inner">
                        <svg className="w-8 h-8 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">User Approval</h2>
                    <p className="text-gray-500 mb-8 leading-relaxed text-sm font-medium">Review and approve new mentor applications.</p>
                    <div className="text-accent font-black group-hover:translate-x-2 transition-transform inline-flex items-center text-sm uppercase tracking-widest">
                        View Applications <span className="ml-2">→</span>
                    </div>
                </Link>

                <Link href="/dashboard/admin/blog" className="p-8 bg-white shadow-xl shadow-gray-200/50 rounded-[40px] border border-gray-100 hover:shadow-blue-100 transition-all group">
                    <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-8 shadow-inner group-hover:scale-110 transition-transform">
                        <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Blog Management</h2>
                    <p className="text-gray-500 mb-8 leading-relaxed text-sm font-medium">Create and manage blog articles for the platform.</p>
                    <div className="text-accent font-black group-hover:translate-x-2 transition-transform inline-flex items-center text-sm uppercase tracking-widest">
                        Manage Articles <span className="ml-2">→</span>
                    </div>
                </Link>

                <div className="p-8 bg-white shadow-xl shadow-gray-200/50 rounded-[40px] border border-gray-100 hover:shadow-green-100 transition-all group">
                    <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center mb-8 shadow-inner">
                        <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Platform Overview</h2>
                    <p className="text-gray-500 mb-8 leading-relaxed text-sm font-medium">Monitor students and mentors activity globally.</p>
                </div>

                <div className="p-8 bg-white shadow-xl shadow-gray-200/50 rounded-[40px] border border-gray-100 hover:shadow-purple-100 transition-all group">
                    <div className="w-16 h-16 bg-purple-50 rounded-2xl flex items-center justify-center mb-8 shadow-inner">
                        <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Payouts</h2>
                    <p className="text-gray-500 mb-8 leading-relaxed text-sm font-medium">Manage fortnightly mentor payments and invoices.</p>
                </div>
            </div>
        </div>
    )
}
