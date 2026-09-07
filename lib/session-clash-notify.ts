import { createAdminClient } from '@/utils/supabase/admin'
import { sendEmail, EMAIL_SENDER_TEAM } from '@/lib/email/client'
import { sessionClashAdmin } from '@/lib/email/templates'
import { formatDateTimeInTz } from '@/lib/timezone'

type AdminClient = ReturnType<typeof createAdminClient>

const DEFAULT_DURATION_MINUTES = 60

/**
 * How far back to look for candidate sessions. A session starting this long
 * before the new one can still overlap it if it runs long; the exact overlap
 * test below is what actually decides. Sessions in production run 60–120
 * minutes, so 6h is a wide margin.
 */
const CANDIDATE_LOOKBACK_MINUTES = 6 * 60

export interface BookedSession {
    sessionId: string
    studentId: string
    mentorId: string
    /** ISO timestamp. */
    scheduledAt: string
    durationMinutes: number | null | undefined
}

interface CandidateSession {
    id: string
    student_id: string
    mentor_id: string
    scheduled_at: string
    duration_minutes: number | null
}

function endOf(startMs: number, durationMinutes: number | null | undefined): number {
    const mins = durationMinutes && durationMinutes > 0 ? durationMinutes : DEFAULT_DURATION_MINUTES
    return startMs + mins * 60 * 1000
}

/**
 * Tell every admin that a session was just booked on top of another one.
 *
 * "On top of" means the two time ranges overlap at all — 15:00–16:00 and
 * 15:45–16:45 count — and the two sessions belong to DIFFERENT students. Two
 * unrelated pairs on the same slot is the case the team cares about: it is
 * allowed, but nobody can sit in on both. A shared mentor is a genuine double
 * booking and the email says so.
 *
 * Overlaps between two sessions for the SAME student are deliberately ignored
 * here — those are duplicate bookings, a separate problem with its own fix.
 *
 * Sends a BRANDED email per admin (direct via Resend) plus an in-app
 * notification. recipient_email is deliberately EMPTY so the generic
 * notifications trigger doesn't also send an unbranded duplicate — same
 * convention as notifyAdminsOfNewIssue in lib/admin-issue-notify.ts.
 *
 * Best-effort: never throws. The session has already committed by the time
 * this runs, and a booking must not fail because an alert could not be sent.
 */
export async function notifyAdminsOfSessionClash(
    db: AdminClient,
    booked: BookedSession
): Promise<void> {
    try {
        const startMs = new Date(booked.scheduledAt).getTime()
        if (Number.isNaN(startMs)) return
        const endMs = endOf(startMs, booked.durationMinutes)

        const windowStart = new Date(startMs - CANDIDATE_LOOKBACK_MINUTES * 60 * 1000).toISOString()
        const windowEnd = new Date(endMs).toISOString()

        const { data: candidates, error: candidateError } = await db
            .from('sessions')
            .select('id, student_id, mentor_id, scheduled_at, duration_minutes')
            .neq('id', booked.sessionId)
            .neq('status', 'cancelled')
            .not('scheduled_at', 'is', null)
            .gte('scheduled_at', windowStart)
            .lte('scheduled_at', windowEnd)

        if (candidateError) {
            console.error('[clash-notify] failed to load candidate sessions:', candidateError)
            return
        }

        // The window is a coarse filter; this is the real overlap test.
        const clashing = ((candidates || []) as CandidateSession[]).filter((c) => {
            if (c.student_id === booked.studentId) return false
            const cStart = new Date(c.scheduled_at).getTime()
            if (Number.isNaN(cStart)) return false
            return cStart < endMs && endOf(cStart, c.duration_minutes) > startMs
        })

        if (clashing.length === 0) return

        const { data: admins, error: adminError } = await db
            .from('profiles')
            .select('id, email')
            .in('role', ['admin', 'admin-dev'])

        if (adminError) {
            console.error('[clash-notify] failed to load admins:', adminError)
            return
        }
        if (!admins || admins.length === 0) return

        // One lookup for every name the email needs.
        const ids = Array.from(
            new Set([
                booked.studentId,
                booked.mentorId,
                ...clashing.flatMap((c) => [c.student_id, c.mentor_id]),
            ])
        )
        const { data: people } = await db.from('profiles').select('id, full_name').in('id', ids)
        const nameOf = (id: string) =>
            (people || []).find((p) => p.id === id)?.full_name || 'Unknown'

        // Admins are the only audience, so render every time in one zone
        // (London) rather than each participant's own — otherwise the times
        // in the email look inconsistent and can't be compared.
        const bookedParty = {
            studentLabel: nameOf(booked.studentId),
            mentorLabel: nameOf(booked.mentorId),
            when: formatDateTimeInTz(booked.scheduledAt, null),
        }

        const clashParties = clashing.map((c) => ({
            studentLabel: nameOf(c.student_id),
            mentorLabel: nameOf(c.mentor_id),
            when: formatDateTimeInTz(c.scheduled_at, null),
            sameMentor: c.mentor_id === booked.mentorId,
        }))

        const tmpl = sessionClashAdmin({ booked: bookedParty, clashes: clashParties })

        await Promise.all(
            admins
                .filter((a) => a.email)
                .map(async (a) => {
                    const sent = await sendEmail({
                        from: EMAIL_SENDER_TEAM,
                        to: a.email as string,
                        subject: tmpl.subject,
                        html: tmpl.html,
                    })
                    if (!sent.ok) {
                        console.error(`[clash-notify] email to ${a.email} failed: ${sent.error}`)
                    }
                })
        )

        const summary = clashParties
            .map((c) => `${c.studentLabel} with ${c.mentorLabel} (${c.when})`)
            .join('; ')

        const rows = admins.map((a) => ({
            recipient_id: a.id,
            recipient_email: '',
            type: 'system_alert' as const,
            title: 'Overlapping sessions booked',
            message: `${bookedParty.studentLabel} booked ${bookedParty.when} with ${bookedParty.mentorLabel}, overlapping: ${summary}`,
            data: {
                kind: 'session_clash',
                action: 'view_sessions',
                session_id: booked.sessionId,
                student_id: booked.studentId,
                mentor_id: booked.mentorId,
                scheduled_at: booked.scheduledAt,
                clashing_session_ids: clashing.map((c) => c.id),
                same_mentor: clashParties.some((c) => c.sameMentor),
            },
        }))

        const { error: notifyError } = await db.from('notifications').insert(rows)
        if (notifyError) console.error('[clash-notify] notification insert failed:', notifyError)
    } catch (e) {
        console.error('[clash-notify] failed:', e)
    }
}
