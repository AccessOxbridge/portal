import { NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { sendEmail, EMAIL_SENDER_TEAM } from '@/lib/email/client'
import { firstSessionFollowup } from '@/lib/email/templates'

/**
 * CRON API Route: "How did your first session go?" follow-up email.
 *
 * Runs once a day. Finds sessions that completed *yesterday* and, for each one
 * that was the student's FIRST completed session with that specific mentor,
 * emails the student. Scoping to the student+mentor pair (rather than the
 * student alone) means a later mentor change correctly re-triggers the email
 * for the new mentor's first session.
 *
 * Path: /api/cron/first-session-followup
 * Schedule: once daily (e.g. 09:00 UTC).
 */
export async function GET(req: Request) {
    // Fail closed: the secret MUST be configured, and the caller MUST present it.
    const cronSecret = process.env.CRON_SECRET
    const authHeader = req.headers.get('authorization')
    if (!cronSecret) {
        console.error('CRON_SECRET is not set; refusing to run /api/cron/first-session-followup.')
        return NextResponse.json({ error: 'Cron not configured' }, { status: 503 })
    }
    if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createAdminClient()
    const now = new Date()

    // Yesterday's window, [start of yesterday, start of today) in UTC.
    const startOfToday = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0)
    )
    const startOfYesterday = new Date(startOfToday.getTime() - 24 * 60 * 60 * 1000)

    const { data: sessions, error } = await supabase
        .from('sessions')
        .select(`
            id, student_id, mentor_id, scheduled_at,
            student:profiles!sessions_student_id_fkey (full_name, email),
            mentor:profiles!sessions_mentor_id_fkey (full_name)
        `)
        .eq('status', 'completed')
        .eq('first_session_followup_sent', false)
        .gte('scheduled_at', startOfYesterday.toISOString())
        .lt('scheduled_at', startOfToday.toISOString())

    if (error) {
        console.error('First-session follow-up cron error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const sent: { session_id: string; student?: string }[] = []
    const skipped: { session_id: string; reason: string }[] = []

    for (const session of sessions || []) {
        const student = session.student as { full_name: string | null; email: string | null } | null
        const mentor = session.mentor as { full_name: string | null } | null

        if (!session.scheduled_at) continue

        // Is this the first completed session for this student+mentor pair?
        const { count: priorCount } = await supabase
            .from('sessions')
            .select('id', { count: 'exact', head: true })
            .eq('student_id', session.student_id)
            .eq('mentor_id', session.mentor_id)
            .eq('status', 'completed')
            .lt('scheduled_at', session.scheduled_at)

        if (priorCount && priorCount > 0) {
            // Not the first session — mark so we don't re-evaluate it daily.
            await supabase
                .from('sessions')
                .update({ first_session_followup_sent: true })
                .eq('id', session.id)
            skipped.push({ session_id: session.id, reason: 'not first session with this mentor' })
            continue
        }

        if (!student?.email) {
            await supabase
                .from('sessions')
                .update({ first_session_followup_sent: true })
                .eq('id', session.id)
            skipped.push({ session_id: session.id, reason: 'student has no email' })
            continue
        }

        const tpl = firstSessionFollowup(student.full_name || '', mentor?.full_name || '')
        const result = await sendEmail({
            from: EMAIL_SENDER_TEAM,
            to: student.email,
            subject: tpl.subject,
            html: tpl.html,
        })

        if (result.ok) {
            await supabase
                .from('sessions')
                .update({ first_session_followup_sent: true })
                .eq('id', session.id)
            sent.push({ session_id: session.id, student: student.email })
        } else {
            // Leave the flag unset so a later run can retry.
            skipped.push({ session_id: session.id, reason: result.error || 'send failed' })
        }
    }

    return NextResponse.json({
        success: true,
        sentCount: sent.length,
        skippedCount: skipped.length,
        sent,
        skipped,
    })
}
