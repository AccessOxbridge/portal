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
        { label: 'Total Mentors', value: mentorsCount || 0, change: '+12%', color: 'text-brand' },
        { label: 'Total Students', value: studentsCount || 0, change: '+18%', color: 'text-success' },
        { label: 'Sessions Taken', value: sessionsCount || 0, change: '+24%', color: 'text-tint-violet-foreground' },
        { label: 'Requests', value: requestsCount || 0, change: '+8%', color: 'text-warning' },
    ]

    return (
        <div className="space-y-8 max-w-6xl mx-auto">
            <header className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-semibold text-foreground tracking-tight">Admin home</h1>
                    <p className="text-muted-foreground mt-1">Welcome back, {profile?.full_name?.split(' ')[0] || 'Admin'}</p>
                </div>
                {/* <div className="flex gap-3">
                    <button className="relative inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full in-data-[density=compact]:rounded-control font-medium outline-none select-none transition-[color,background-color,border-color,box-shadow,scale] duration-150 ease-out enabled:active:scale-[0.96] [&:is(a)]:active:scale-[0.96] focus-visible:ring-[3px] focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-50 [&_svg]:shrink-0 border border-transparent bg-card text-foreground shadow-border hover:bg-muted h-9 px-4 text-sm in-data-[density=compact]:h-8 in-data-[density=compact]:px-3">
                        Download report
                    </button>
                    <button className="relative inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full in-data-[density=compact]:rounded-control font-medium outline-none select-none transition-[color,background-color,border-color,box-shadow,scale] duration-150 ease-out enabled:active:scale-[0.96] [&:is(a)]:active:scale-[0.96] focus-visible:ring-[3px] focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-50 [&_svg]:shrink-0 bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 text-sm in-data-[density=compact]:h-8 in-data-[density=compact]:px-3">
                        Add new mentor
                    </button>
                </div> */}
            </header>

            {/* Alert / Notice */}
            <div className="bg-muted/60 border border-border rounded-card p-6 flex items-start gap-4">
                <div className="size-10 rounded-full bg-card border border-border flex items-center justify-center shrink-0 shadow-border">
                    <svg className="size-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <div>
                    <h3 className="font-semibold text-foreground">Payment processing is not yet available</h3>
                    <p className="text-muted-foreground text-sm mt-1">Complete all steps below to start accepting payments from customers</p>
                </div>
            </div>

            {/* Action Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Link href="/dashboard/admin/clients" className="border border-transparent bg-card p-8 rounded-card shadow-border hover:shadow-border transition-[background-color,box-shadow,color] duration-150 group flex flex-col h-full">
                    <div className="size-12 bg-tint-amber rounded-card flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                        <svg className="size-6 text-tint-amber-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" /></svg>
                    </div>
                    <h2 className="text-xl font-semibold text-foreground mb-2">Client management</h2>
                    <p className="text-muted-foreground text-sm mb-8 grow">Manage client accounts, subscriptions, and support tickets.</p>
                    <span className="w-full py-3 bg-muted/60 group-hover:bg-primary group-hover:text-white text-muted-foreground text-center rounded-control text-sm font-semibold transition-colors">
                        Manage clients
                    </span>
                </Link>

                <Link href="/dashboard/admin/mentors" className="border border-transparent bg-card p-8 rounded-card shadow-border hover:shadow-border transition-[background-color,box-shadow,color] duration-150 group flex flex-col h-full">
                    <div className="size-12 bg-tint-green rounded-card flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                        <svg className="size-6 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l9-5-9-5-9 5 9 5z m0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z m-4 6v-7.5l4-2.222" /></svg>
                    </div>
                    <h2 className="text-xl font-semibold text-foreground mb-2">Mentor management</h2>
                    <p className="text-muted-foreground text-sm mb-8 grow">Oversee mentor profiles, availability, and performance metrics.</p>
                    <span className="w-full py-3 bg-muted/60 group-hover:bg-primary group-hover:text-white text-muted-foreground text-center rounded-control text-sm font-semibold transition-colors">
                        Manage mentors
                    </span>
                </Link>

                <Link href="/dashboard/admin/blog" className="border border-transparent bg-card p-8 rounded-card shadow-border hover:shadow-border transition-[background-color,box-shadow,color] duration-150 group flex flex-col h-full">
                    <div className="size-12 bg-tint-blue rounded-card flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                        <svg className="size-6 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10l2 2h2a2 2 0 012 2v10a2 2 0 01-2 2z" /></svg>
                    </div>
                    <h2 className="text-xl font-semibold text-foreground mb-2">Blog management</h2>
                    <p className="text-muted-foreground text-sm mb-8 grow">Create and manage content for the Oxford-Bridge network.</p>
                    <span className="w-full py-3 bg-muted/60 group-hover:bg-primary group-hover:text-white text-muted-foreground text-center rounded-control text-sm font-semibold transition-colors">
                        Manage articles
                    </span>
                </Link>

                <Link href="/dashboard/admin/creators" className="border border-transparent bg-card p-8 rounded-card shadow-border hover:shadow-border transition-[background-color,box-shadow,color] duration-150 group flex flex-col h-full">
                    <div className="size-12 bg-tint-violet rounded-card flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                        <svg className="size-6 text-tint-violet-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                    </div>
                    <h2 className="text-xl font-semibold text-foreground mb-2">Creator management</h2>
                    <p className="text-muted-foreground text-sm mb-8 grow">Manage content creators and track referral performance.</p>
                    <span className="w-full py-3 bg-muted/60 group-hover:bg-primary group-hover:text-white text-muted-foreground text-center rounded-control text-sm font-semibold transition-colors">
                        Manage creators
                    </span>
                </Link>
            </div>

            {/* Detailed Stats Section */}
            <div className="border border-transparent bg-card rounded-card p-8 shadow-border">
                <div className="flex items-center justify-between mb-8">
                    <h3 className="text-lg font-semibold text-foreground">Platform performance</h3>
                    <div className="relative">
                        <select className="bg-muted/60 border border-border rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground focus:outline-none appearance-none pr-8">
                            <option>Last 30 days</option>
                            <option>Last 7 days</option>
                            <option>All time</option>
                        </select>
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
                            <svg width="10" height="10" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </div>
                    </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                    {stats.map((stat) => (
                        <div key={stat.label} className="space-y-2">
                            <span className="text-sm font-medium text-muted-foreground">{stat.label}</span>
                            <div className="flex items-baseline gap-2">
                                <span className="text-3xl font-semibold text-foreground">{stat.value}</span>
                                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-muted/60 ${stat.color}`}>{stat.change}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
