import { sendEmail, EMAIL_SENDER_TEAM } from '@/lib/email/client'
import {
    sessionRescheduleDeclinedStudent,
    sessionRescheduleDeclinedMentor,
} from '@/lib/email/templates'
import { formatDateInTz, formatTimeInTz } from '@/lib/timezone'
import type { SupabaseClient } from '@supabase/supabase-js'

const DATE_OPTS: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long' }

export function formatSessionWhen(
    iso: string | null | undefined,
    tz: string | null
): { date: string; time: string; display: string } {
    if (!iso) {
        return { date: 'TBD', time: 'TBD', display: 'TBD' }
    }
    const date = formatDateInTz(iso, tz, DATE_OPTS)
    const time = formatTimeInTz(iso, tz, { withZone: true })
    return { date, time, display: `${date} at ${time}` }
}

/**
 * Notify both parties that a reschedule was declined or withdrawn.
 * Email failures must not throw.
 */
export async function notifyRescheduleDeclined(args: {
    supabase: SupabaseClient
    studentId: string
    mentorId: string
    originalScheduledAt: string | null
    withdrawnByProposer?: boolean
}) {
    const { supabase, studentId, mentorId, originalScheduledAt, withdrawnByProposer = false } = args

    const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', [studentId, mentorId])

    const studentProfile = profiles?.find((p) => p.id === studentId)
    const mentorProfile = profiles?.find((p) => p.id === mentorId)

    const { data: studentTzRow } = await supabase
        .from('student_profiles')
        .select('timezone')
        .eq('id', studentId)
        .maybeSingle()
    const studentTz = studentTzRow?.timezone ?? null

    const { data: mentorTzRow } = await supabase
        .from('mentors')
        .select('timezone')
        .eq('id', mentorId)
        .maybeSingle()
    const mentorTz = (mentorTzRow as { timezone?: string | null } | null)?.timezone ?? null

    const studentWhen = formatSessionWhen(originalScheduledAt, studentTz)
    const mentorWhen = formatSessionWhen(originalScheduledAt, mentorTz)

    const title = withdrawnByProposer ? 'Reschedule Withdrawn' : 'Reschedule Declined'
    const studentMessage = withdrawnByProposer
        ? `The reschedule request was withdrawn. Your session on ${studentWhen.display} still stands.`
        : `The reschedule request was declined. Your session on ${studentWhen.display} still stands.`
    const mentorMessage = withdrawnByProposer
        ? `The reschedule request was withdrawn. Your session on ${mentorWhen.display} still stands.`
        : `The reschedule request was declined. Your session on ${mentorWhen.display} still stands.`

    if (studentProfile?.email) {
        await supabase.from('notifications').insert({
            recipient_id: studentId,
            recipient_email: studentProfile.email,
            type: 'session_reschedule_declined' as const,
            title,
            message: studentMessage,
            data: {
                mentor_id: mentorId,
                mentor_name: mentorProfile?.full_name || 'Mentor',
                original_scheduled_at: originalScheduledAt,
            },
        })
    }

    if (mentorProfile?.email) {
        await supabase.from('notifications').insert({
            recipient_id: mentorId,
            recipient_email: mentorProfile.email,
            type: 'session_reschedule_declined' as const,
            title,
            message: mentorMessage,
            data: {
                student_id: studentId,
                student_name: studentProfile?.full_name || 'Student',
                original_scheduled_at: originalScheduledAt,
            },
        })
    }

    try {
        if (studentProfile?.email) {
            const tpl = sessionRescheduleDeclinedStudent(
                studentProfile.full_name || '',
                mentorProfile?.full_name || '',
                studentWhen.date,
                studentWhen.time,
                withdrawnByProposer
            )
            await sendEmail({
                from: EMAIL_SENDER_TEAM,
                to: studentProfile.email,
                subject: tpl.subject,
                html: tpl.html,
            })
        }
        if (mentorProfile?.email) {
            const tpl = sessionRescheduleDeclinedMentor(
                mentorProfile.full_name || '',
                studentProfile?.full_name || '',
                mentorWhen.date,
                mentorWhen.time,
                withdrawnByProposer
            )
            await sendEmail({
                from: EMAIL_SENDER_TEAM,
                to: mentorProfile.email,
                subject: tpl.subject,
                html: tpl.html,
            })
        }
    } catch (emailError) {
        console.error('Reschedule decline email error:', emailError)
    }
}
