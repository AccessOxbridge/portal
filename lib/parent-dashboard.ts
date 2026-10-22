import type { SupabaseClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import type { Database } from '@/utils/supabase/types'
import { MILESTONES } from '@/config/milestones.config'
import { getMentorPhotoUrl } from '@/lib/mentor-photo'
import { describePace, isPlanType, parseStartDate, type SessionTarget } from '@/lib/session-frequency'
import { formatDateInTz, formatTimeInTz, resolveTz } from '@/lib/timezone'

/*
 * Data for the parent pages (/dashboard/parent/*). Every read goes through
 * the parent's own RLS-respecting client: the database only returns rows for
 * the one linked child (see 20261022180100_parent_access.sql). Nothing here
 * writes, and nothing here uses the service role.
 */

type Client = SupabaseClient<Database>

const DAY_MS = 24 * 60 * 60 * 1000
const WEEK_MS = 7 * DAY_MS
/** Weeks shown on the progress graph. */
const PROGRESS_WEEKS = 10
/** "Recent" in Sessions attended. */
const RECENT_DAYS = 28

export interface ParentContext {
    userId: string
    parentFirstName: string
    childId: string | null
    childFirstName: string | null
    timezone: string
}

export interface ParentReport {
    id: string
    dateLabel: string
    mentorName: string
    summary: string | null
    keyPoints: string[]
    nextSteps: string[]
    /** The written report (markdown), when there is one. */
    fullReport: string | null
}

export interface ParentNextSession {
    dateLabel: string
    timeLabel: string
    when: string
    topic: string | null
    mentorName: string
    mentorPhotoUrl: string | null
}

export interface ParentMentor {
    name: string
    photoUrl: string | null
    college: string | null
    subject: string | null
    bio: string | null
}

export interface ProgressPoint {
    label: string
    completed: number
    plan: number | null
}

export interface ParentHomeData {
    parentFirstName: string
    childFirstName: string | null
    linked: boolean
    greeting: string
    timezoneLabel: string
    checklist: { activated: boolean; profile: boolean; matched: boolean; booked: boolean }
    next: ParentNextSession | null
    progress: { points: ProgressPoint[]; total: number; planLabel: string | null } | null
    attended: { total: number; recent: number; upcoming: number }
    reports: ParentReport[]
    reportsTotal: number
    mentor: ParentMentor | null
    goal: { university: string | null; course: string | null; entryYear: number | null } | null
    milestones: { thresholds: readonly number[]; completed: number }
    hoursLeft: number | null
}

export interface ParentSessionRow {
    id: string
    dateLabel: string
    timeLabel: string
    mentorName: string
    minutes: number | null
    status: 'upcoming' | 'completed' | 'cancelled' | 'unconfirmed'
    hasReport: boolean
    hasRecording: boolean
}

function firstName(fullName: string | null | undefined): string {
    return (fullName || '').trim().split(/\s+/)[0] || ''
}

/** "Europe/London" → "London". */
export function timezoneLabel(tz: string): string {
    return (tz.split('/').pop() || tz).replace(/_/g, ' ')
}

function greetingAt(now: Date, tz: string): string {
    const hour = Number(new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hourCycle: 'h23', timeZone: tz }).format(now))
    return hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
}

/** Calendar date of an instant in `tz`, as YYYY-MM-DD (en-CA formats that way). */
function dayKey(d: Date, tz: string): string {
    return new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(d)
}

function relativeDay(when: Date, now: Date, tz: string): string {
    const days = Math.round((Date.parse(dayKey(when, tz)) - Date.parse(dayKey(now, tz))) / DAY_MS)
    if (days <= 0) return 'Today'
    if (days === 1) return 'Tomorrow'
    return `In ${days} days`
}

const longDate = (d: string | Date, tz: string) => formatDateInTz(d, tz, { weekday: 'long', day: 'numeric', month: 'long' })
const shortDate = (d: string | Date, tz: string) => formatDateInTz(d, tz, { weekday: 'short', day: 'numeric', month: 'short' })

/**
 * The signed-in parent, their linked child (if any) and the time zone to
 * show times in (the child's, since that is when the sessions happen).
 * Anyone who isn't a parent is sent back to /dashboard.
 */
export async function requireParent(supabase: Client): Promise<ParentContext> {
    const {
        data: { user },
    } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { data: me } = await supabase.from('profiles').select('role, full_name').eq('id', user.id).single()
    if (me?.role !== 'parent') redirect('/dashboard')

    const [{ data: link }, { data: details }] = await Promise.all([
        supabase.from('parent_student_links').select('student_id').eq('parent_id', user.id).is('revoked_at', null).maybeSingle(),
        supabase.from('parent_profiles').select('child_first_name').eq('id', user.id).maybeSingle(),
    ])

    let childFirstName = details?.child_first_name || null
    let timezone = resolveTz(null)
    if (link) {
        const [{ data: child }, { data: academic }] = await Promise.all([
            supabase.from('profiles').select('full_name').eq('id', link.student_id).maybeSingle(),
            supabase.from('student_profiles').select('timezone').eq('id', link.student_id).maybeSingle(),
        ])
        childFirstName = firstName(child?.full_name) || childFirstName
        timezone = resolveTz(academic?.timezone)
    }

    return {
        userId: user.id,
        parentFirstName: firstName(me.full_name) || 'there',
        childId: link?.student_id ?? null,
        childFirstName,
        timezone,
    }
}

type SessionRow = {
    id: string
    status: string
    scheduled_at: string | null
    duration_minutes: number | null
    actual_minutes: number | null
    recording_available: boolean | null
    mentor_id: string
    mentor: { full_name: string | null; photo_url: unknown } | null
}

async function loadSessions(supabase: Client, childId: string): Promise<SessionRow[]> {
    const { data } = await supabase
        .from('sessions')
        .select('id, status, scheduled_at, duration_minutes, actual_minutes, recording_available, mentor_id, mentor:profiles!sessions_mentor_id_fkey (full_name, photo_url:mentors(photo_url))')
        .eq('student_id', childId)
        .order('scheduled_at', { ascending: true, nullsFirst: false })
    return (data || []) as unknown as SessionRow[]
}

function asStrings(value: unknown): string[] {
    return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string' && v.trim().length > 0) : []
}

/** All of the child's session reports, newest session first. */
export async function loadParentReports(supabase: Client, ctx: ParentContext, sessions?: SessionRow[]): Promise<ParentReport[]> {
    if (!ctx.childId) return []
    const rows = sessions ?? (await loadSessions(supabase, ctx.childId))
    if (!rows.length) return []
    const { data: reports } = await supabase
        .from('session_reports')
        .select('id, session_id, summary, key_points, action_items, personalized_report, created_at')
        .in('session_id', rows.map((s) => s.id))

    const byId = new Map(rows.map((s) => [s.id, s]))
    return (reports || [])
        .map((r) => ({ r, s: byId.get(r.session_id) }))
        .filter((x): x is { r: NonNullable<typeof reports>[number]; s: SessionRow } => Boolean(x.s))
        .map((x) => ({ ...x, at: x.s.scheduled_at || x.r.created_at || '' }))
        .sort((a, b) => (Date.parse(b.at) || 0) - (Date.parse(a.at) || 0))
        .map(({ r, s, at }) => ({
            id: r.id,
            dateLabel: at ? longDate(at, ctx.timezone) : 'Date not recorded',
            mentorName: s.mentor?.full_name || 'Mentor',
            summary: r.summary?.trim() || null,
            keyPoints: asStrings(r.key_points),
            nextSteps: asStrings(r.action_items),
            fullReport: r.personalized_report?.trim() || null,
        }))
}

/** Upcoming first (soonest first), then past sessions (newest first). */
export async function loadParentSessions(supabase: Client, ctx: ParentContext, now = new Date()): Promise<ParentSessionRow[]> {
    if (!ctx.childId) return []
    const rows = await loadSessions(supabase, ctx.childId)
    const { data: reports } = rows.length
        ? await supabase.from('session_reports').select('session_id').in('session_id', rows.map((s) => s.id))
        : { data: [] }
    const reported = new Set((reports || []).map((r) => r.session_id))

    const mapped = rows
        .filter((s) => s.scheduled_at)
        .map((s) => {
            const at = Date.parse(s.scheduled_at as string)
            const status: ParentSessionRow['status'] =
                s.status === 'completed' ? 'completed' : s.status === 'cancelled' ? 'cancelled' : at > now.getTime() ? 'upcoming' : 'unconfirmed'
            const row: ParentSessionRow = {
                id: s.id,
                dateLabel: shortDate(s.scheduled_at as string, ctx.timezone),
                timeLabel: formatTimeInTz(s.scheduled_at, ctx.timezone, { withZone: false }),
                mentorName: s.mentor?.full_name || 'Mentor',
                minutes: s.status === 'completed' ? (s.actual_minutes ?? s.duration_minutes) : s.duration_minutes,
                status,
                hasReport: reported.has(s.id),
                hasRecording: Boolean(s.recording_available),
            }
            return { row, at }
        })
    const upcoming = mapped.filter((x) => x.row.status === 'upcoming').sort((a, b) => a.at - b.at)
    const past = mapped.filter((x) => x.row.status !== 'upcoming').sort((a, b) => b.at - a.at)
    return [...upcoming, ...past].map((x) => x.row)
}

/**
 * Total sessions completed at the end of each of the last few weeks, and,
 * when the admin set a plan, where the plan says the total should be. Before
 * the plan starts the plan line follows the real total. Same counting rule
 * as the pace check and milestones: status 'completed' only.
 */
export function buildProgress(completedAt: Date[], target: SessionTarget | null, now: Date, tz: string): ParentHomeData['progress'] {
    if (!completedAt.length) return null
    const first = Math.min(...completedAt.map((d) => d.getTime()))
    const weeks = Math.max(2, Math.min(PROGRESS_WEEKS, Math.floor((now.getTime() - first) / WEEK_MS) + 2))
    const countBy = (t: number) => completedAt.filter((d) => d.getTime() <= t).length

    const start = target ? parseStartDate(target.startDate).getTime() : null
    const rate = target ? target.sessions / target.weeks : 0
    const beforeStart = start !== null ? completedAt.filter((d) => d.getTime() < start).length : 0

    const points: ProgressPoint[] = []
    for (let k = 0; k < weeks; k++) {
        const end = now.getTime() - (weeks - 1 - k) * WEEK_MS
        let plan: number | null = null
        if (target && start !== null && start <= now.getTime()) {
            if (end < start) {
                plan = countBy(end)
            } else {
                const due = rate * ((end - start) / WEEK_MS)
                plan = beforeStart + (target.planType === 'package' ? Math.min(target.sessions, due) : due)
            }
        }
        points.push({ label: formatDateInTz(new Date(end), tz, { day: 'numeric', month: 'short' }), completed: countBy(end), plan })
    }

    return {
        points,
        total: completedAt.length,
        planLabel: target && start !== null && start <= now.getTime() ? describePace(target.sessions, target.weeks) : null,
    }
}

/** Everything the parent home page shows. */
export async function loadParentHome(supabase: Client, ctx: ParentContext, now = new Date()): Promise<ParentHomeData> {
    const base: ParentHomeData = {
        parentFirstName: ctx.parentFirstName,
        childFirstName: ctx.childFirstName,
        linked: Boolean(ctx.childId),
        greeting: greetingAt(now, ctx.timezone),
        timezoneLabel: timezoneLabel(ctx.timezone),
        checklist: { activated: false, profile: false, matched: false, booked: false },
        next: null,
        progress: null,
        attended: { total: 0, recent: 0, upcoming: 0 },
        reports: [],
        reportsTotal: 0,
        mentor: null,
        goal: null,
        milestones: { thresholds: MILESTONES, completed: 0 },
        hoursLeft: null,
    }
    const childId = ctx.childId
    if (!childId) return base

    const [sessions, { data: academic }, { data: assignments }, { data: targetRow }, { data: account }, { data: signedIn }] = await Promise.all([
        loadSessions(supabase, childId),
        supabase.from('student_profiles').select('is_complete, target_university, target_course, application_year').eq('id', childId).maybeSingle(),
        supabase.from('student_mentor_assignments').select('mentor_id, created_at').eq('student_id', childId).eq('is_current', true).order('created_at', { ascending: false }),
        supabase.from('student_session_targets').select('plan_type, sessions, weeks, start_date').eq('student_id', childId).maybeSingle(),
        supabase.from('profiles_private').select('credits').eq('id', childId).maybeSingle(),
        supabase.rpc('my_child_has_signed_in'),
    ])

    const nowMs = now.getTime()
    const completedAt = sessions
        .filter((s) => s.status === 'completed' && s.scheduled_at)
        .map((s) => new Date(s.scheduled_at as string))
    const upcoming = sessions.filter((s) => s.status === 'active' && s.scheduled_at && Date.parse(s.scheduled_at) > nowMs)

    const target: SessionTarget | null =
        targetRow && isPlanType(targetRow.plan_type) && targetRow.sessions > 0 && Number(targetRow.weeks) > 0
            ? { planType: targetRow.plan_type, sessions: targetRow.sessions, weeks: Number(targetRow.weeks), startDate: targetRow.start_date }
            : null

    const nextRow = upcoming[0]
    const next: ParentNextSession | null = nextRow
        ? {
              dateLabel: longDate(nextRow.scheduled_at as string, ctx.timezone),
              timeLabel: formatTimeInTz(nextRow.scheduled_at, ctx.timezone, { withZone: false }),
              when: relativeDay(new Date(nextRow.scheduled_at as string), now, ctx.timezone),
              // Needs the booking "topic" field (planned).
              topic: null,
              mentorName: nextRow.mentor?.full_name || 'Mentor',
              mentorPhotoUrl: getMentorPhotoUrl(nextRow.mentor),
          }
        : null

    // Current mentor: the latest current assignment, else whoever the next
    // session is with.
    const mentorId = assignments?.[0]?.mentor_id ?? nextRow?.mentor_id ?? null
    let mentor: ParentMentor | null = null
    if (mentorId) {
        const [{ data: person }, { data: details }] = await Promise.all([
            supabase.from('profiles').select('full_name').eq('id', mentorId).maybeSingle(),
            supabase.from('mentors').select('bio, photo_url, university, q_oxbridge_college, q_specialisation, expertise').eq('id', mentorId).maybeSingle(),
        ])
        const college = [details?.q_oxbridge_college, details?.university].filter((v) => v && v.trim()).join(', ')
        mentor = {
            name: person?.full_name || 'Mentor',
            photoUrl: details?.photo_url || null,
            college: college || null,
            subject: details?.q_specialisation?.trim() || details?.expertise?.[0] || null,
            bio: details?.bio?.trim() || null,
        }
    }

    const reports = await loadParentReports(supabase, ctx, sessions)
    const goal =
        academic && (academic.target_university || academic.target_course)
            ? { university: academic.target_university, course: academic.target_course, entryYear: academic.application_year }
            : null

    return {
        ...base,
        checklist: {
            activated: signedIn === true,
            profile: Boolean(academic?.is_complete),
            matched: Boolean(assignments?.length),
            booked: sessions.some((s) => s.status !== 'cancelled'),
        },
        next,
        progress: buildProgress(completedAt, target, now, ctx.timezone),
        attended: {
            total: completedAt.length,
            recent: completedAt.filter((d) => nowMs - d.getTime() <= RECENT_DAYS * DAY_MS).length,
            upcoming: upcoming.length,
        },
        reports: reports.slice(0, 2),
        reportsTotal: reports.length,
        mentor,
        goal,
        milestones: { thresholds: MILESTONES, completed: completedAt.length },
        hoursLeft: account?.credits ?? null,
    }
}
