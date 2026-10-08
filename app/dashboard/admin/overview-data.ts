import { createAdminClient } from '@/utils/supabase/admin'
import { getZonedNow, zonedTimeToUtcISO } from '@/lib/timezone'

/**
 * Everything the admin home shows, from real rows. Read-only.
 *
 * Uses the admin client because row-level security hides sessions and
 * requests from the admin's own session (which is why the old home showed
 * "Sessions taken: 0"). The caller must have checked the admin role first,
 * exactly as manage-sessions and session-payouts do.
 *
 * Only completed sessions count as "done": those are the ones that are paid.
 * Weeks run Monday to Sunday and months by the calendar, both in UK time.
 */

const TZ = 'Europe/London'
const HOUR = 60 * 60 * 1000
const DAY = 24 * HOUR

export interface AdminOverview {
    attention: {
        applications: number
        requestsPending: number
        requestsOver48h: number
        reportsOverdue: number
        openIssues: number
        openHelpRequests: number
        studentsNoHours: number
        studentsNoMentor: number
        invoicesToPay: number
        invoicesToPayCents: number
        upcomingNoZoom: number
    }
    upcoming: { id: string; at: string; student: string; mentor: string; hasZoom: boolean }[]
    completedThisWeek: number
    completedLastWeek: number
    newStudentsThisMonth: number
    /** Hours added to students' balances: purchases plus admin top-ups (net of corrections). */
    hoursAddedThisMonth: number
    hoursAddedLastMonth: number
    lastMonthLabel: string
    rating30d: { average: number | null; count: number }
    weekly: { weekStart: string; completed: number }[]
    atRisk: { id: string; name: string; lastLogin: string | null }[]
    atRiskTotal: number
    /** Sign-ins are only recorded from this date, so 'none' means none since then. */
    loginTrackingSince: string | null
    totals: { mentors: number; students: number; completedSessions: number }
}

/** Monday 00:00 UK time of the week containing `date` (YYYY-MM-DD), as an ISO instant. */
function weekStartIso(date: string): string {
    const d = new Date(`${date}T12:00:00Z`)
    const back = (d.getUTCDay() + 6) % 7
    d.setUTCDate(d.getUTCDate() - back)
    return zonedTimeToUtcISO(d.toISOString().slice(0, 10), '00:00', TZ)
}

function ukDate(iso: string): string {
    return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date(iso))
}

function formatMonth(iso: string): string {
    return new Intl.DateTimeFormat('en-GB', { timeZone: TZ, month: 'long' }).format(new Date(iso))
}

const nameOf = (p: unknown) => (p as { full_name?: string | null } | null)?.full_name || 'Unknown'

export async function loadAdminOverview(): Promise<AdminOverview> {
    const db = createAdminClient()
    const now = new Date()
    const nowIso = now.toISOString()
    const today = getZonedNow(TZ).date
    const thisWeek = weekStartIso(today)
    const lastWeek = new Date(new Date(thisWeek).getTime() - 7 * DAY).toISOString()
    const twelveWeeksAgo = new Date(new Date(thisWeek).getTime() - 11 * 7 * DAY).toISOString()
    const monthStart = zonedTimeToUtcISO(`${today.slice(0, 7)}-01`, '00:00', TZ)
    const [year, month] = today.split('-').map(Number)
    const lastMonthKey = month === 1 ? `${year - 1}-12` : `${year}-${String(month - 1).padStart(2, '0')}`
    const lastMonthStart = zonedTimeToUtcISO(`${lastMonthKey}-01`, '00:00', TZ)
    const in7Days = new Date(now.getTime() + 7 * DAY).toISOString()
    const ago48h = new Date(now.getTime() - 48 * HOUR).toISOString()
    const ago30d = new Date(now.getTime() - 30 * DAY).toISOString()
    const ago90d = new Date(now.getTime() - 90 * DAY).toISOString()
    const ago14d = new Date(now.getTime() - 14 * DAY)

    const [
        applications,
        requestsPending,
        requestsOver48h,
        issues,
        students,
        assignments,
        invoices,
        upcoming,
        completedRecent,
        studentProfilesThisMonth,
        topUps,
        ratings,
        logins,
        mentorsTotal,
        completedTotal,
    ] = await Promise.all([
        db.from('mentors').select('*', { count: 'exact', head: true }).eq('status', 'pending_approval'),
        db.from('mentorship_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        db.from('mentorship_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending').lt('created_at', ago48h),
        db.from('user_issues').select('issue_type').neq('status', 'resolved'),
        db.from('profiles').select('id, full_name, credits').eq('role', 'student'),
        db.from('student_mentor_assignments').select('student_id').eq('is_current', true),
        db.from('mentor_invoices').select('total_cents').eq('status', 'submitted'),
        db.from('sessions')
            .select('id, scheduled_at, zoom_join_url, student:profiles!sessions_student_id_fkey(full_name), mentor:profiles!sessions_mentor_id_fkey(full_name)')
            .eq('status', 'active')
            .gte('scheduled_at', nowIso)
            .lte('scheduled_at', in7Days)
            .order('scheduled_at', { ascending: true }),
        db.from('sessions').select('id, scheduled_at').eq('status', 'completed').gte('scheduled_at', twelveWeeksAgo < ago90d ? twelveWeeksAgo : ago90d),
        db.from('student_profiles').select('*', { count: 'exact', head: true }).gte('created_at', monthStart),
        // Hours reach students two ways: a portal purchase or an admin top-up.
        // Both write a credit transaction; the portal holds no revenue figures.
        db.from('credit_transactions').select('amount, created_at').in('type', ['purchase', 'admin_adjustment']).gte('created_at', lastMonthStart),
        db.from('form_responses').select('rating').eq('form_type', 'student_feedback').gte('created_at', ago30d),
        db.from('login_events').select('user_id, created_at').eq('status', 'success').order('created_at', { ascending: false }).limit(5000),
        db.from('mentors').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        db.from('sessions').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
    ])

    // Reports overdue: completed in the last 90 days, more than 48 hours ago,
    // with no mentor report yet.
    const completedRows = completedRecent.data ?? []
    const reportCandidates = completedRows.filter((s) => s.scheduled_at && s.scheduled_at >= ago90d && s.scheduled_at < ago48h)
    let reportsOverdue = 0
    if (reportCandidates.length > 0) {
        const { data: reports } = await db
            .from('form_responses')
            .select('session_id')
            .eq('form_type', 'mentor_report')
            .in('session_id', reportCandidates.map((s) => s.id))
        const done = new Set((reports ?? []).map((r) => r.session_id))
        reportsOverdue = reportCandidates.filter((s) => !done.has(s.id)).length
    }

    // Completed sessions per UK week, oldest first, including empty weeks.
    const weekly = Array.from({ length: 12 }, (_, i) => ({
        weekStart: new Date(new Date(twelveWeeksAgo).getTime() + i * 7 * DAY).toISOString(),
        completed: 0,
    }))
    let completedThisWeek = 0
    let completedLastWeek = 0
    for (const s of completedRows) {
        if (!s.scheduled_at || s.scheduled_at > nowIso) continue
        const start = weekStartIso(ukDate(s.scheduled_at))
        const bucket = weekly.find((w) => w.weekStart === start)
        if (bucket) bucket.completed++
        if (s.scheduled_at >= thisWeek) completedThisWeek++
        else if (s.scheduled_at >= lastWeek) completedLastWeek++
    }

    const studentRows = students.data ?? []
    const assigned = new Set((assignments.data ?? []).map((a) => a.student_id))
    const issueRows = issues.data ?? []
    const invoiceRows = invoices.data ?? []
    const topUpRows = topUps.data ?? []
    const hoursIn = (from: string, to: string) =>
        topUpRows.filter((t) => t.created_at && t.created_at >= from && t.created_at < to).reduce((sum, t) => sum + (t.amount ?? 0), 0)
    const ratingRows = (ratings.data ?? []).filter((r) => typeof r.rating === 'number')
    const upcomingRows = upcoming.data ?? []

    // At risk: students with hours or a mentor who haven't signed in for 14+ days.
    const lastLogin = new Map<string, string>()
    const loginRows = logins.data ?? []
    for (const e of loginRows) {
        if (e.user_id && !lastLogin.has(e.user_id)) lastLogin.set(e.user_id, e.created_at)
    }
    const atRiskAll = studentRows
        .filter((s) => (s.credits ?? 0) > 0 || assigned.has(s.id))
        .map((s) => ({ id: s.id, name: s.full_name || 'Unknown', lastLogin: lastLogin.get(s.id) ?? null }))
        .filter((s) => !s.lastLogin || new Date(s.lastLogin) < ago14d)
        .sort((a, b) => (a.lastLogin ?? '').localeCompare(b.lastLogin ?? ''))

    return {
        attention: {
            applications: applications.count ?? 0,
            requestsPending: requestsPending.count ?? 0,
            requestsOver48h: requestsOver48h.count ?? 0,
            reportsOverdue,
            openIssues: issueRows.filter((i) => i.issue_type !== 'student_help').length,
            openHelpRequests: issueRows.filter((i) => i.issue_type === 'student_help').length,
            studentsNoHours: studentRows.filter((s) => (s.credits ?? 0) <= 0).length,
            studentsNoMentor: studentRows.filter((s) => !assigned.has(s.id)).length,
            invoicesToPay: invoiceRows.length,
            invoicesToPayCents: invoiceRows.reduce((sum, i) => sum + (i.total_cents ?? 0), 0),
            upcomingNoZoom: upcomingRows.filter((s) => !s.zoom_join_url).length,
        },
        upcoming: upcomingRows.slice(0, 6).map((s) => ({
            id: s.id,
            at: s.scheduled_at as string,
            student: nameOf(s.student),
            mentor: nameOf(s.mentor),
            hasZoom: !!s.zoom_join_url,
        })),
        completedThisWeek,
        completedLastWeek,
        newStudentsThisMonth: studentProfilesThisMonth.count ?? 0,
        hoursAddedThisMonth: hoursIn(monthStart, '9999'),
        hoursAddedLastMonth: hoursIn(lastMonthStart, monthStart),
        lastMonthLabel: formatMonth(lastMonthStart),
        rating30d: {
            average: ratingRows.length ? ratingRows.reduce((sum, r) => sum + (r.rating as number), 0) / ratingRows.length : null,
            count: ratingRows.length,
        },
        weekly,
        atRisk: atRiskAll.slice(0, 6),
        atRiskTotal: atRiskAll.length,
        loginTrackingSince: loginRows.length ? loginRows[loginRows.length - 1].created_at : null,
        totals: {
            mentors: mentorsTotal.count ?? 0,
            students: studentRows.length,
            completedSessions: completedTotal.count ?? 0,
        },
    }
}
