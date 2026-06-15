import { NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { sendEmail, EMAIL_SENDER_TEAM } from '@/lib/email/client'
import { sessionInactivityStudent, sessionInactivityMentor } from '@/lib/email/templates'

/**
 * CRON API Route: "Time to book your next session" nudge.
 *
 * Runs once a day. For each current student↔mentor pairing, emails both parties
 * when their most recent session was more than INACTIVITY_DAYS ago and there's
 * nothing already in motion (no upcoming session booked, no pending request).
 *
 * Throttled via student_mentor_assignments.last_inactivity_nudge_at so a pair is
 * nudged at most once per NUDGE_COOLDOWN_DAYS, not every day the cron runs.
 *
 * Path: /api/cron/session-inactivity
 * Schedule: once daily.
 */
const INACTIVITY_DAYS = 14
const NUDGE_COOLDOWN_DAYS = 14

export async function GET(req: Request) {
    const authHeader = req.headers.get('authorization')
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createAdminClient()
    const now = new Date()
    const nowIso = now.toISOString()
    const inactivityCutoff = new Date(now.getTime() - INACTIVITY_DAYS * 24 * 60 * 60 * 1000)
    const nudgeCooldownCutoff = new Date(now.getTime() - NUDGE_COOLDOWN_DAYS * 24 * 60 * 60 * 1000)

    const { data: assignments, error } = await supabase
        .from('student_mentor_assignments')
        .select(`
            id, student_id, mentor_id, last_inactivity_nudge_at,
            student:profiles!student_mentor_assignments_student_id_fkey (full_name, email),
            mentor:profiles!student_mentor_assignments_mentor_id_fkey (full_name, email)
        `)
        .eq('is_current', true)

    if (error) {
        console.error('Session inactivity cron error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const nudged: { id: string }[] = []
    const skipped: { id: string; reason: string }[] = []

    for (const a of assignments || []) {
        // Throttle: skip pairs nudged within the cooldown window.
        if (a.last_inactivity_nudge_at && new Date(a.last_inactivity_nudge_at) > nudgeCooldownCutoff) {
            skipped.push({ id: a.id, reason: 'nudged recently' })
            continue
        }

        // Something already in flight — student has asked, awaiting mentor.
        const { count: pendingCount } = await supabase
            .from('mentorship_requests')
            .select('id', { count: 'exact', head: true })
            .eq('student_id', a.student_id)
            .eq('mentor_id', a.mentor_id)
            .eq('status', 'pending')

        if (pendingCount && pendingCount > 0) {
            skipped.push({ id: a.id, reason: 'pending request in flight' })
            continue
        }

        // Already has an upcoming session booked — nothing to nudge about.
        const { count: upcomingCount } = await supabase
            .from('sessions')
            .select('id', { count: 'exact', head: true })
            .eq('student_id', a.student_id)
            .eq('mentor_id', a.mentor_id)
            .eq('status', 'active')
            .gt('scheduled_at', nowIso)

        if (upcomingCount && upcomingCount > 0) {
            skipped.push({ id: a.id, reason: 'upcoming session booked' })
            continue
        }

        // Most recent session that has actually taken place (not cancelled).
        const { data: lastSessions } = await supabase
            .from('sessions')
            .select('scheduled_at')
            .eq('student_id', a.student_id)
            .eq('mentor_id', a.mentor_id)
            .in('status', ['active', 'completed'])
            .lte('scheduled_at', nowIso)
            .order('scheduled_at', { ascending: false })
            .limit(1)

        const lastScheduledAt = lastSessions?.[0]?.scheduled_at
        if (!lastScheduledAt) {
            // No session has happened yet — the matched / first-session flows cover this.
            skipped.push({ id: a.id, reason: 'no prior session' })
            continue
        }
        if (new Date(lastScheduledAt) > inactivityCutoff) {
            skipped.push({ id: a.id, reason: 'recent session' })
            continue
        }

        const student = a.student as { full_name: string | null; email: string | null } | null
        const mentor = a.mentor as { full_name: string | null; email: string | null } | null

        let anySent = false

        if (student?.email) {
            const tpl = sessionInactivityStudent(student.full_name || '', mentor?.full_name || '')
            const r = await sendEmail({
                from: EMAIL_SENDER_TEAM,
                to: student.email,
                subject: tpl.subject,
                html: tpl.html,
            })
            anySent = anySent || r.ok
        }

        if (mentor?.email) {
            const tpl = sessionInactivityMentor(mentor.full_name || '', student?.full_name || '')
            const r = await sendEmail({
                from: EMAIL_SENDER_TEAM,
                to: mentor.email,
                subject: tpl.subject,
                html: tpl.html,
            })
            anySent = anySent || r.ok
        }

        // Only mark as nudged when something actually went out, so a transient
        // send failure retries on the next run rather than waiting a full cooldown.
        if (anySent) {
            await supabase
                .from('student_mentor_assignments')
                .update({ last_inactivity_nudge_at: nowIso })
                .eq('id', a.id)
            nudged.push({ id: a.id })
        } else {
            skipped.push({ id: a.id, reason: 'no recipients / send failed' })
        }
    }

    return NextResponse.json({
        success: true,
        nudgedCount: nudged.length,
        skippedCount: skipped.length,
        nudged,
        skipped,
    })
}
