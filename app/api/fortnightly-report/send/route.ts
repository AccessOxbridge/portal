import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import OpenAI from 'openai'
import {
    FORTNIGHTLY_REPORT_STUDENT_SYSTEM,
    FORTNIGHTLY_REPORT_STUDENT_USER,
    FORTNIGHTLY_REPORT_PARENT_SYSTEM,
    FORTNIGHTLY_REPORT_PARENT_USER
} from '@/config/prompts.config'
import { buildFortnightlyReportEmailHtml } from '@/lib/fortnightly-report-email'
import { getFortnightWindowForDate } from '@/lib/fortnight'

const RESEND_API_URL = 'https://api.resend.com/emails'

function getPeriodLabel(startDate: Date, endDate: Date): string {
    const fmt = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    return `${fmt(startDate)} – ${fmt(endDate)}`
}

function getFortnightEndingLabel(endDate: Date): string {
    return endDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

function buildConsolidatedContext(
    sessionsWithReports: {
        scheduled_at: string | null
        summary: string | null
        key_points: string[] | null
        action_items: string[] | null
        personalized_report: string | null
        mentor_responses: Record<string, unknown> | null
    }[]
): string {
    const parts: string[] = []
    sessionsWithReports.forEach((s, i) => {
        const date = s.scheduled_at
            ? new Date(s.scheduled_at).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })
            : 'Date unknown'
        parts.push(`--- Session ${i + 1} (${date}) ---`)
        if (s.summary) parts.push(`Summary: ${s.summary}`)
        if (s.key_points?.length) parts.push(`Key points: ${s.key_points.join('; ')}`)
        if (s.action_items?.length) parts.push(`Action items: ${s.action_items.join('; ')}`)
        if (s.personalized_report) {
            const excerpt = s.personalized_report.replace(/\n/g, ' ').slice(0, 800)
            parts.push(`Personalized report excerpt: ${excerpt}${s.personalized_report.length > 800 ? '...' : ''}`)
        }
        if (s.mentor_responses && typeof s.mentor_responses === 'object') {
            const r = s.mentor_responses as Record<string, unknown>
            if (r.topics_covered) parts.push(`Mentor – topics covered: ${String(r.topics_covered)}`)
            if (r.next_steps) parts.push(`Mentor – next steps: ${String(r.next_steps)}`)
            if (r.areas_of_improvement) parts.push(`Mentor – areas of improvement: ${String(r.areas_of_improvement)}`)
            if (r.overall_rating) parts.push(`Mentor – overall rating: ${String(r.overall_rating)}`)
            if (r.student_engagement) parts.push(`Mentor – student engagement: ${String(r.student_engagement)}`)
            if (r.additional_notes) parts.push(`Mentor – additional notes: ${String(r.additional_notes)}`)
        }
        parts.push('')
    })
    return parts.join('\n').trim() || 'No session details available for this period.'
}

export async function POST(req: Request) {
    try {
        const supabase = await createClient()
        const adminSupabase = createAdminClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { data: profile } = await adminSupabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        if (!profile || !['admin', 'admin-dev'].includes(profile.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const body = await req.json().catch(() => ({}))
        const studentIds = Array.isArray(body.studentIds) ? body.studentIds : undefined
        const endDateParam = typeof body.endDate === 'string' ? body.endDate : null
        const previewOnly = body.previewOnly === true

        // Interpret provided date as a calendar date in the server's local
        // timezone to avoid cross-month drift when users pick a day in the
        // fortnight. Expecting YYYY-MM-DD from the client.
        let rawEndDate: Date
        if (endDateParam && /^\d{4}-\d{2}-\d{2}$/.test(endDateParam)) {
            const [y, m, d] = endDateParam.split('-').map(Number)
            // Use midday to be safely inside the chosen date regardless of DST.
            rawEndDate = new Date(y, m - 1, d, 12, 0, 0, 0)
        } else if (endDateParam) {
            rawEndDate = new Date(endDateParam)
        } else {
            rawEndDate = new Date()
        }

        const { startDate, endDate } = getFortnightWindowForDate(rawEndDate)
        const periodLabel = getPeriodLabel(startDate, endDate)
        const startIso = startDate.toISOString()
        const endIso = endDate.toISOString()

        const openai = new OpenAI({ apiKey: process.env.OPEN_AI_API_KEY })
        const resendKey = process.env.RESEND_API_KEY
        if (!resendKey) {
            return NextResponse.json({ error: 'RESEND_API_KEY is not configured' }, { status: 500 })
        }

        let targetStudentIds: string[] = studentIds ?? []

        if (targetStudentIds.length === 0) {
            const { data: sessionsInPeriod } = await adminSupabase
                .from('sessions')
                .select('student_id')
                .gte('scheduled_at', startIso)
                .lte('scheduled_at', endIso)
            const unique = new Set((sessionsInPeriod || []).map(s => s.student_id))
            targetStudentIds = Array.from(unique)
        }

        const results: {
            studentId: string
            studentName: string
            studentEmail?: string
            parentEmail?: string
            sentToStudent: boolean
            sentToParent: boolean
            error?: string
            studentSubject?: string
            parentSubject?: string
            studentReportHtml?: string
            parentReportHtml?: string
        }[] = []

        for (const studentId of targetStudentIds) {
            let studentName = 'Student'
            let studentEmail: string | null = null
            let parentEmail: string | null = null

            const { data: studentProfile } = await adminSupabase
                .from('profiles')
                .select('full_name, email')
                .eq('id', studentId)
                .single()
            if (studentProfile) {
                studentName = studentProfile.full_name || studentName
                studentEmail = studentProfile.email
            }

            let subjectFocus = 'Not specified'
            const { data: studentExtra } = await adminSupabase
                .from('student_profiles')
                .select('parent_email, target_course')
                .eq('id', studentId)
                .single()
            if (studentExtra?.parent_email) {
                parentEmail = studentExtra.parent_email
            }
            if (studentExtra?.target_course && String(studentExtra.target_course).trim()) {
                subjectFocus = String(studentExtra.target_course).trim()
            }

            const { data: sessions } = await adminSupabase
                .from('sessions')
                .select('id, scheduled_at')
                .eq('student_id', studentId)
                .gte('scheduled_at', startIso)
                .lte('scheduled_at', endIso)
                .order('scheduled_at', { ascending: true })

            if (!sessions || sessions.length === 0) {
                results.push({
                    studentId,
                    studentName,
                    studentEmail: studentEmail || undefined,
                    parentEmail: parentEmail || undefined,
                    sentToStudent: false,
                    sentToParent: false,
                    error: 'No sessions in this period'
                })
                continue
            }

            const sessionIds = sessions.map(s => s.id)
            const { data: reports } = await adminSupabase
                .from('session_reports')
                .select('session_id, summary, key_points, action_items, personalized_report')
                .in('session_id', sessionIds)

            const { data: mentorResponses } = await adminSupabase
                .from('form_responses')
                .select('session_id, responses')
                .eq('form_type', 'mentor_report')
                .in('session_id', sessionIds)

            const reportBySession = new Map((reports || []).map(r => [r.session_id, r]))
            const mentorBySession = new Map((mentorResponses || []).map(m => [m.session_id, m.responses as Record<string, unknown>]))

            const sessionsWithReports = sessions.map(s => {
                const r = reportBySession.get(s.id)
                const m = mentorBySession.get(s.id)
                return {
                    scheduled_at: s.scheduled_at,
                    summary: r?.summary ?? null,
                    key_points: (r?.key_points as string[] | null) ?? null,
                    action_items: (r?.action_items as string[] | null) ?? null,
                    personalized_report: r?.personalized_report ?? null,
                    mentor_responses: m ?? null
                }
            })

            const consolidatedContext = buildConsolidatedContext(sessionsWithReports)
            const fortnightEnding = getFortnightEndingLabel(endDate)

            const studentPrompt = FORTNIGHTLY_REPORT_STUDENT_USER(studentName, subjectFocus, fortnightEnding, sessions.length, consolidatedContext)
            const parentPrompt = FORTNIGHTLY_REPORT_PARENT_USER(studentName, subjectFocus, fortnightEnding, sessions.length, consolidatedContext)

            const [studentCompletion, parentCompletion] = await Promise.all([
                openai.chat.completions.create({
                    model: 'gpt-4o',
                    messages: [
                        { role: 'system', content: FORTNIGHTLY_REPORT_STUDENT_SYSTEM },
                        { role: 'user', content: studentPrompt }
                    ],
                    temperature: 0.3
                }),
                openai.chat.completions.create({
                    model: 'gpt-4o',
                    messages: [
                        { role: 'system', content: FORTNIGHTLY_REPORT_PARENT_SYSTEM },
                        { role: 'user', content: parentPrompt }
                    ],
                    temperature: 0.3
                })
            ])

            const studentBodyHtml = studentCompletion.choices[0]?.message?.content?.trim() || '<p>No report content generated.</p>'
            const parentBodyHtml = parentCompletion.choices[0]?.message?.content?.trim() || '<p>No report content generated.</p>'

            const fromEmail = process.env.RESEND_FROM_EMAIL || 'Oxbridge Portal <onboarding@resend.dev>'
            const subjectPeriod = periodLabel.replace(' – ', ' to ')
            const subject = `Your Fortnightly Progress Report from ${subjectPeriod}`
            const parentSubject = `Fortnightly Progress Report for ${studentName} from ${subjectPeriod}`

            const studentFullHtml = buildFortnightlyReportEmailHtml(studentBodyHtml, subject)
            const parentFullHtml = buildFortnightlyReportEmailHtml(parentBodyHtml, parentSubject)

            let sentToStudent = false
            let sentToParent = false
            let err: string | undefined

            if (studentEmail && !previewOnly) {
                const res = await fetch(RESEND_API_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${resendKey}`
                    },
                    body: JSON.stringify({
                        from: fromEmail,
                        to: studentEmail,
                        subject,
                        html: studentFullHtml
                    })
                })
                const data = await res.json().catch(() => ({}))
                if (res.ok) {
                    sentToStudent = true
                } else {
                    err = (data.message || data.error || res.statusText) as string
                }
            }

            if (parentEmail && !previewOnly) {
                const res = await fetch(RESEND_API_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${resendKey}`
                    },
                    body: JSON.stringify({
                        from: fromEmail,
                        to: parentEmail,
                        subject: parentSubject,
                        html: parentFullHtml
                    })
                })
                const data = await res.json().catch(() => ({}))
                if (res.ok) {
                    sentToParent = true
                } else if (!err) {
                    err = (data.message || data.error || res.statusText) as string
                }
            }

            results.push({
                studentId,
                studentName,
                studentEmail: studentEmail || undefined,
                parentEmail: parentEmail || undefined,
                sentToStudent,
                sentToParent,
                error: err,
                studentSubject: subject,
                parentSubject,
                studentReportHtml: studentFullHtml,
                parentReportHtml: parentFullHtml
            })
        }

        return NextResponse.json({
            success: true,
            periodLabel,
            startDate: startIso,
            endDate: endIso,
            results
        })
    } catch (e: unknown) {
        console.error('[fortnightly-report]', e)
        return NextResponse.json(
            { error: e instanceof Error ? e.message : 'Failed to generate or send fortnightly reports' },
            { status: 500 }
        )
    }
}
