import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, Article, GraduationCap, Megaphone, UsersThree, WarningCircle } from '@phosphor-icons/react/ssr'
import type { Icon as PhosphorIcon } from '@phosphor-icons/react'
import { PageHeader } from '@/components/ui/page-header'
import { SelectField } from '@/components/ui/select'
import { cn } from '@/utils/lib'

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
        { label: 'Total mentors', value: mentorsCount || 0, change: '+12%', color: 'text-brand' },
        { label: 'Total students', value: studentsCount || 0, change: '+18%', color: 'text-success' },
        { label: 'Sessions taken', value: sessionsCount || 0, change: '+24%', color: 'text-tint-violet-foreground' },
        { label: 'Requests', value: requestsCount || 0, change: '+8%', color: 'text-warning' },
    ]

    return (
        <div className="mx-auto max-w-6xl space-y-6">
            <PageHeader
                title="Admin home"
                description={`Welcome back, ${profile?.full_name?.split(' ')[0] || 'Admin'}`}
            />

            {/* Alert / Notice */}
            <div className="flex items-start gap-3 rounded-card bg-tint-amber px-4 py-3 ring-1 ring-tint-amber-foreground/15">
                <WarningCircle weight="fill" className="mt-0.5 size-5 shrink-0 text-warning" />
                <div>
                    <h3 className="text-sm font-semibold text-foreground">Payment processing is not yet available</h3>
                    <p className="mt-0.5 text-sm text-tint-amber-foreground">Complete all steps below to start accepting payments from customers</p>
                </div>
            </div>

            {/* Action Cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Shortcut href="/dashboard/admin/clients" title="Client management" body="Manage client accounts, subscriptions, and support tickets." cta="Manage clients" icon={UsersThree} tint="bg-tint-amber text-tint-amber-foreground" />
                <Shortcut href="/dashboard/admin/mentors" title="Mentor management" body="Oversee mentor profiles, availability, and performance metrics." cta="Manage mentors" icon={GraduationCap} tint="bg-tint-green text-tint-green-foreground" />
                <Shortcut href="/dashboard/admin/blog" title="Blog management" body="Create and manage content for the Oxford-Bridge network." cta="Manage articles" icon={Article} tint="bg-tint-blue text-tint-blue-foreground" />
                <Shortcut href="/dashboard/admin/creators" title="Creator management" body="Manage content creators and track referral performance." cta="Manage creators" icon={Megaphone} tint="bg-tint-violet text-tint-violet-foreground" />
            </div>

            {/* Detailed Stats Section */}
            <div className="rounded-card border border-transparent bg-card p-5 shadow-border">
                <div className="mb-5 flex items-center justify-between gap-3">
                    <h3 className="text-base font-semibold text-foreground">Platform performance</h3>
                    <SelectField aria-label="Period" className="w-40">
                        <option>Last 30 days</option>
                        <option>Last 7 days</option>
                        <option>All time</option>
                    </SelectField>
                </div>
                <div className="grid grid-cols-2 gap-px overflow-hidden rounded-control bg-border md:grid-cols-4">
                    {stats.map((stat) => (
                        <div key={stat.label} className="space-y-1 bg-card p-4">
                            <span className="text-sm text-muted-foreground">{stat.label}</span>
                            <div className="flex items-baseline gap-2">
                                <span className="text-2xl font-semibold tracking-tight text-foreground tabular-nums">{stat.value}</span>
                                <span className={`rounded-md bg-muted px-1.5 py-0.5 text-xs font-medium tabular-nums ${stat.color}`}>{stat.change}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

function Shortcut({ href, title, body, cta, icon: Icon, tint }: { href: string; title: string; body: string; cta: string; icon: PhosphorIcon; tint: string }) {
    return (
        <Link
            href={href}
            className="group flex flex-col rounded-card border border-transparent bg-card p-5 shadow-border outline-none transition-shadow duration-150 ease-out hover:shadow-border-hover focus-visible:ring-[3px] focus-visible:ring-ring/40"
        >
            <span className={cn('mb-4 grid size-9 place-items-center rounded-control', tint)}>
                <Icon weight="duotone" className="size-5" />
            </span>
            <h2 className="text-base font-semibold text-foreground">{title}</h2>
            <p className="mt-1 mb-5 grow text-sm text-muted-foreground text-pretty">{body}</p>
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-brand">
                {cta}
                <ArrowRight weight="bold" className="size-3.5 transition-transform duration-150 ease-out group-hover:translate-x-0.5" />
            </span>
        </Link>
    )
}
