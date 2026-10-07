import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { redirect } from 'next/navigation'
import { AlertTriangle, CircleDashed, CheckCircle2, Flag, TrendingDown } from 'lucide-react'
import { MENTOR_FLAG_THRESHOLD, MENTOR_RECENT_DAYS, ONGOING_WINDOW_WEEKS } from '@/lib/session-frequency'
import { loadPerformanceData } from './data'
import StudentPaceTable from './student-pace-table'
import MentorRatingsTable from './mentor-ratings-table'

export const dynamic = 'force-dynamic'

/**
 * Performance: are students keeping up with the session pace an admin set
 * for them, and how are mentors rated?
 *
 * Same auth-then-service-role shape as the Feedback page: `sessions` has no
 * admin SELECT policy, so after confirming the caller is an admin through the
 * RLS client we read through the service-role client. Reads only; the only
 * writes on this page are the target actions in ./actions.ts.
 */
export default async function AdminPerformancePage() {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
        redirect('/login')
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (!profile || !['admin', 'admin-dev'].includes(profile.role)) {
        redirect('/dashboard')
    }

    const { studentRows, mentorRows } = await loadPerformanceData(createAdminClient())

    const count = (status: string) => studentRows.filter((r) => r.pace.status === status).length
    const behind = count('behind')
    const slipping = count('slipping')
    const onTrack = count('on_track') + count('complete') + count('not_started')
    const noTarget = count('no_target')
    const flaggedMentors = mentorRows.filter((m) => m.rating.flagged).length

    const cards = [
        { label: 'Behind', value: behind, icon: TrendingDown, tone: 'text-red-600', bg: 'bg-red-50' },
        { label: 'Slipping', value: slipping, icon: AlertTriangle, tone: 'text-amber-600', bg: 'bg-amber-50' },
        { label: 'On track', value: onTrack, icon: CheckCircle2, tone: 'text-green-600', bg: 'bg-green-50' },
        { label: 'No target set', value: noTarget, icon: CircleDashed, tone: 'text-gray-500', bg: 'bg-gray-50' },
        { label: 'Mentors flagged', value: flaggedMentors, icon: Flag, tone: 'text-red-600', bg: 'bg-red-50' },
    ]

    return (
        <div className="max-w-7xl mx-auto space-y-10">
            <header>
                <h1 className="text-3xl sm:text-4xl font-extrabold text-accent tracking-tight">Performance</h1>
                <p className="mt-3 text-gray-500 text-lg">
                    Students against their target session pace, and mentor ratings.
                </p>
            </header>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {cards.map((card) => (
                    <div key={card.label} className="bg-white rounded-2xl border border-gray-200 p-5">
                        <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-medium text-gray-500">{card.label}</p>
                            <span className={`w-8 h-8 rounded-xl ${card.bg} flex items-center justify-center`}>
                                <card.icon className={`w-4 h-4 ${card.tone}`} />
                            </span>
                        </div>
                        <p className={`mt-2 text-3xl font-black tabular-nums ${card.value > 0 ? card.tone : 'text-gray-900'}`}>
                            {card.value}
                        </p>
                    </div>
                ))}
            </div>

            <section className="space-y-4">
                <div>
                    <h2 className="text-xl font-bold text-gray-900">Students</h2>
                    <p className="text-sm text-gray-500 mt-1">
                        <span className="font-semibold text-red-600">Behind</span>: no completed session for twice
                        their interval (e.g. 2 weeks on a weekly plan), or 2+ sessions short of pace.{' '}
                        <span className="font-semibold text-amber-600">Slipping</span>: 1 session short, or the gap
                        is past 1.5× the interval. Packages count every session since the start date; ongoing plans
                        count the last {ONGOING_WINDOW_WEEKS} weeks. Only sessions Zoom marked as completed count.
                    </p>
                </div>
                <StudentPaceTable rows={studentRows} />
            </section>

            <section className="space-y-4">
                <div>
                    <h2 className="text-xl font-bold text-gray-900">Mentors</h2>
                    <p className="text-sm text-gray-500 mt-1">
                        Average of students&apos; after-session ratings. Flagged for follow-up when the average is
                        below {MENTOR_FLAG_THRESHOLD}, or any rating in the last {MENTOR_RECENT_DAYS} days is below{' '}
                        {MENTOR_FLAG_THRESHOLD}.
                    </p>
                </div>
                <MentorRatingsTable rows={mentorRows} />
            </section>
        </div>
    )
}
