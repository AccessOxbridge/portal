import type { SupabaseClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import type { Database } from '@/utils/supabase/types'
import { MILESTONES } from '@/config/milestones.config'
import { getMentorPhotoUrl } from '@/lib/mentor-photo'
import { formatDateInTz, formatTimeInTz, resolveTz } from '@/lib/timezone'
import type { ParentDocument, StudentInfo } from '@/lib/parent-student-info'

/*
 * Data for the parent pages (/dashboard/parent/*). Every read goes through
 * the parent's own RLS-respecting client: the database only returns rows for
 * the one linked child (see 20261023072008_parent_access.sql). Nothing here
 * writes, and nothing here uses the service role.
 */

type Client = SupabaseClient<Database>

const DAY_MS = 24 * 60 * 60 * 1000
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

export interface ParentHomeData {
    parentFirstName: string
    childFirstName: string | null
    linked: boolean
    greeting: string
    /** Getting started: info sent, offer made, enrolled (mentor matched), first session booked. */
    checklist: { submitted: boolean; offered: boolean; enrolled: boolean; learning: boolean }
    /** What the parent told us about their child, and the documents they uploaded. */
    studentInfo: StudentInfo | null
    documents: ParentDocument[]
    next: ParentNextSession | null
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

    const [{ data: link }, { data: details }, { data: info }] = await Promise.all([
        supabase.from('parent_student_links').select('student_id').eq('parent_id', user.id).is('revoked_at', null).maybeSingle(),
        supabase.from('parent_profiles').select('child_first_name').eq('id', user.id).maybeSingle(),
        supabase.from('parent_student_info').select('child_first_name').eq('parent_id', user.id).maybeSingle(),
    ])

    // The linked child's name wins; then the name the team entered; then the
    // one the parent gave on the student profile form.
    let childFirstName = details?.child_first_name || info?.child_first_name || null
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

/** Everything the parent home page shows. */
export async function loadParentHome(supabase: Client, ctx: ParentContext, now = new Date()): Promise<ParentHomeData> {
    const base: ParentHomeData = {
        parentFirstName: ctx.parentFirstName,
        childFirstName: ctx.childFirstName,
        linked: Boolean(ctx.childId),
        greeting: greetingAt(now, ctx.timezone),
        checklist: { submitted: false, offered: false, enrolled: false, learning: false },
        studentInfo: null,
        documents: [],
        next: null,
        attended: { total: 0, recent: 0, upcoming: 0 },
        reports: [],
        reportsTotal: 0,
        mentor: null,
        goal: null,
        milestones: { thresholds: MILESTONES, completed: 0 },
        hoursLeft: null,
    }
    const profile = await loadStudentProfile(supabase, ctx.userId)
    base.studentInfo = profile.info
    base.documents = profile.documents
    base.checklist.submitted = Boolean(profile.info)

    const childId = ctx.childId
    if (!childId) return base

    const [sessions, { data: academic }, { data: assignments }, { data: account }] = await Promise.all([
        loadSessions(supabase, childId),
        supabase.from('student_profiles').select('target_university, target_course, application_year').eq('id', childId).maybeSingle(),
        supabase.from('student_mentor_assignments').select('mentor_id, created_at').eq('student_id', childId).eq('is_current', true).order('created_at', { ascending: false }),
        supabase.from('profiles_private').select('credits').eq('id', childId).maybeSingle(),
    ])

    const nowMs = now.getTime()
    const completedAt = sessions
        .filter((s) => s.status === 'completed' && s.scheduled_at)
        .map((s) => new Date(s.scheduled_at as string))
    const upcoming = sessions.filter((s) => s.status === 'active' && s.scheduled_at && Date.parse(s.scheduled_at) > nowMs)

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
            // A linked family has been through the consultation and enrolled,
            // whether or not the parent used the form.
            submitted: true,
            offered: true,
            enrolled: Boolean(assignments?.length),
            learning: sessions.some((s) => s.status !== 'cancelled'),
        },
        next,
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

/** The parent's own student profile form and uploaded documents (RLS: their own rows). */
export async function loadStudentProfile(supabase: Client, parentId: string): Promise<{ info: StudentInfo | null; documents: ParentDocument[] }> {
    const [{ data: info }, { data: docs }] = await Promise.all([
        supabase.from('parent_student_info').select('*').eq('parent_id', parentId).maybeSingle(),
        supabase.from('parent_documents').select('id, file_name, mime_type, size_bytes, created_at').eq('parent_id', parentId).order('created_at', { ascending: false }),
    ])
    return {
        info: info
            ? {
                  childFirstName: info.child_first_name,
                  childLastName: info.child_last_name ?? '',
                  school: info.school ?? '',
                  yearGroup: info.year_group ?? '',
                  subjects: info.subjects ?? '',
                  courseInterest: info.course_interest ?? '',
                  universityPreference: info.university_preference ?? '',
                  notes: info.notes ?? '',
              }
            : null,
        documents: (docs || []).map((d) => ({ id: d.id, fileName: d.file_name, mimeType: d.mime_type, sizeBytes: d.size_bytes, createdAt: d.created_at })),
    }
}
