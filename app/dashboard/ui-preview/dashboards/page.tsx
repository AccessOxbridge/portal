import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { cn } from '@/utils/lib'
import AdminOverview from '@/app/dashboard/admin/admin-overview'
import { loadAdminOverview } from '@/app/dashboard/admin/overview-data'
import MentorOverview from '@/app/dashboard/mentor/mentor-overview'
import { loadMentorOverview } from '@/app/dashboard/mentor/overview-data'

/**
 * /dashboard/ui-preview/dashboards: development only, admins only.
 *
 * The proposed admin and mentor homes with real data, side by side with
 * nothing replaced. Read-only. The mentor view can be pointed at any mentor
 * with ?view=mentor&mentor=<id>; on the live page each mentor only ever sees
 * their own data through their own signed-in client.
 */
export default async function DashboardsPreview({ searchParams }: { searchParams: Promise<{ view?: string; mentor?: string }> }) {
    if (process.env.NODE_ENV === 'production') notFound()

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return redirect('/login')
    const { data: profile } = await supabase.from('profiles').select('role, full_name').eq('id', user.id).single()
    if (!profile || (profile.role !== 'admin' && profile.role !== 'admin-dev')) notFound()

    const { view = 'admin', mentor: mentorParam } = await searchParams
    const admin = createAdminClient()
    const { data: mentors } = await admin
        .from('mentors')
        .select('id, profile:profiles!mentors_id_fkey(full_name)')
        .eq('status', 'active')
    const mentorList = (mentors ?? []).map((m) => ({
        id: m.id as string,
        name: ((Array.isArray(m.profile) ? m.profile[0] : m.profile) as { full_name?: string } | null)?.full_name || 'Mentor',
    })).sort((a, b) => a.name.localeCompare(b.name))
    const mentorId = mentorParam || mentorList.find((m) => m.name.includes('[MENTOR]'))?.id || mentorList[0]?.id

    const tab = (active: boolean) => cn('rounded-full px-3.5 py-1.5 text-sm font-medium', active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground')

    return (
        <div className="space-y-6 pb-16">
            <div className="flex flex-wrap items-center gap-3 rounded-card bg-tint-amber px-4 py-3 text-sm text-tint-amber-foreground md:me-14">
                <span className="font-medium">Preview with real data, nothing replaced.</span>
                <div className="inline-flex rounded-full bg-card p-1 shadow-border">
                    <Link href="?view=admin" className={tab(view === 'admin')}>Admin home</Link>
                    <Link href={`?view=mentor&mentor=${mentorId ?? ''}`} className={tab(view === 'mentor')}>Mentor home</Link>
                </div>
                {view === 'mentor' && (
                    <span className="flex flex-wrap items-center gap-1">
                        Showing:
                        {mentorList.map((m) => (
                            <Link key={m.id} href={`?view=mentor&mentor=${m.id}`} className={cn('rounded-full px-2 py-0.5', m.id === mentorId ? 'bg-card font-medium text-foreground' : 'hover:underline')}>
                                {m.name}
                            </Link>
                        ))}
                    </span>
                )}
            </div>

            {view === 'mentor' && mentorId ? (
                <MentorOverview data={await loadMentorOverview(admin, mentorId)} />
            ) : (
                <div data-density="compact">
                    <AdminOverview data={await loadAdminOverview()} firstName={(profile.full_name || 'Admin').split(' ')[0]} />
                </div>
            )}
        </div>
    )
}
