import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { formatTimeInTz } from '@/lib/timezone';
import { sendEmail, EMAIL_SENDER_TEAM } from '@/lib/email/client';
import { sessionReminderStudent, sessionReminderMentor } from '@/lib/email/templates';

/**
 * Format the session time once per recipient, each in their own timezone
 * (student tz on student_profiles, mentor tz on mentors), with a zone label.
 */
async function recipientTimes(
    supabase: ReturnType<typeof createAdminClient>,
    session: any
): Promise<{ studentTimeStr: string; mentorTimeStr: string }> {
    const [{ data: sp }, { data: mr }] = await Promise.all([
        supabase.from('student_profiles').select('timezone').eq('id', session.student_id).maybeSingle(),
        supabase.from('mentors').select('timezone').eq('id', session.mentor_id).maybeSingle(),
    ]);
    const studentTz = (sp as { timezone?: string | null } | null)?.timezone ?? null;
    const mentorTz = (mr as { timezone?: string | null } | null)?.timezone ?? null;
    return {
        studentTimeStr: formatTimeInTz(session.scheduled_at, studentTz, { withZone: true }),
        mentorTimeStr: formatTimeInTz(session.scheduled_at, mentorTz, { withZone: true }),
    };
}

/**
 * CRON API Route: Sends reminders to students and mentors before a session starts.
 *  - 1 hour before (email + in-app, existing behaviour)
 *  - 15 minutes before (in-app only)
 *
 * Path: /api/cron/reminders
 *
 * This route should be triggered every 10–15 minutes by a CRON scheduler.
 */
export async function GET(req: Request) {
    // Fail closed: the secret MUST be configured, and the caller MUST present it.
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = req.headers.get('authorization');
    if (!cronSecret) {
        console.error('CRON_SECRET is not set; refusing to run /api/cron/reminders.');
        return NextResponse.json({ error: 'Cron not configured' }, { status: 503 });
    }
    if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminClient();

    const now = new Date();

    // -------------------------------
    // 1. One-hour reminders (existing)
    // -------------------------------
    const windowStart = new Date(now.getTime() + 45 * 60 * 1000);
    const windowEnd = new Date(now.getTime() + 75 * 60 * 1000);

    const { data: upcomingSessions, error: fetchError } = await supabase
        .from('sessions')
        .select(`
            *,
            student:profiles!sessions_student_id_fkey (full_name, email),
            mentor:profiles!sessions_mentor_id_fkey (full_name, email)
        `)
        .eq('status', 'active')
        .eq('reminder_sent', false)
        .gte('scheduled_at', windowStart.toISOString())
        .lte('scheduled_at', windowEnd.toISOString());

    if (fetchError) {
        console.error('Reminder cron error (1h):', fetchError);
        return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    const sentOneHourReminders: any[] = [];

    if (upcomingSessions && upcomingSessions.length > 0) {
        for (const session of upcomingSessions) {
            const student = session.student as any;
            const mentor = session.mentor as any;

            if (!student || !mentor || !session.scheduled_at) continue;

            const { studentTimeStr, mentorTimeStr } = await recipientTimes(supabase, session);

            // Branded reminder emails (verified sender). Zoom links are portal-only —
            // emails point people to their sessions dashboard instead.
            // Best-effort: a send failure must not break the loop or the
            // reminder_sent update. We send the email directly here, so the
            // notification rows below set recipient_email='' to stop the edge
            // function from sending a second (generic) email.
            try {
                if (student.email) {
                    const tpl = sessionReminderStudent(student.full_name || '', mentor.full_name || '', studentTimeStr);
                    await sendEmail({ from: EMAIL_SENDER_TEAM, to: student.email, subject: tpl.subject, html: tpl.html });
                }
                if (mentor.email) {
                    const tpl = sessionReminderMentor(mentor.full_name || '', student.full_name || '', mentorTimeStr);
                    await sendEmail({ from: EMAIL_SENDER_TEAM, to: mentor.email, subject: tpl.subject, html: tpl.html });
                }
            } catch (emailError) {
                console.error('Reminder email error:', emailError);
            }

            // 1. Notify Student (in-app; email handled above)
            await supabase.from('notifications').insert({
                recipient_id: session.student_id,
                recipient_email: '',
                type: 'session_reminder' as any,
                title: 'Reminder: Mentorship Session in 1 hour!',
                message: `Your session with ${mentor.full_name} starts at ${studentTimeStr}. See you soon!`,
                data: {
                    session_id: session.id,
                    scheduled_at: session.scheduled_at
                }
            });

            // 2. Notify Mentor (in-app; email handled above)
            await supabase.from('notifications').insert({
                recipient_id: session.mentor_id,
                recipient_email: '',
                type: 'session_reminder' as any,
                title: 'Reminder: Mentorship Session in 1 hour!',
                message: `Your session with ${student.full_name} starts at ${mentorTimeStr}. Ready?`,
                data: {
                    session_id: session.id,
                    scheduled_at: session.scheduled_at
                }
            });

            // 3. Mark as sent
            await supabase.from('sessions')
                .update({ reminder_sent: true } as any)
                .eq('id', session.id);

            sentOneHourReminders.push({
                session_id: session.id,
                student: student.email,
                mentor: mentor.email
            });
        }
    }

    // -------------------------------
    // 2. Fifteen-minute in-app reminders
    // -------------------------------
    const shortWindowStart = new Date(now.getTime() + 10 * 60 * 1000);
    const shortWindowEnd = new Date(now.getTime() + 20 * 60 * 1000);

    const { data: shortSessions, error: shortFetchError } = await supabase
        .from('sessions')
        .select(`
            *,
            student:profiles!sessions_student_id_fkey (full_name, email),
            mentor:profiles!sessions_mentor_id_fkey (full_name, email)
        `)
        .eq('status', 'active')
        .eq('short_reminder_sent', false as any)
        .gte('scheduled_at', shortWindowStart.toISOString())
        .lte('scheduled_at', shortWindowEnd.toISOString());

    if (shortFetchError) {
        console.error('Reminder cron error (15m):', shortFetchError);
        return NextResponse.json({ error: shortFetchError.message }, { status: 500 });
    }

    const sentFifteenMinuteReminders: any[] = [];
    const insertErrors: string[] = [];

    if (shortSessions && shortSessions.length > 0) {
        for (const session of shortSessions) {
            const student = session.student as any;
            const mentor = session.mentor as any;

            if (!student || !mentor || !session.scheduled_at) continue;

            const { studentTimeStr, mentorTimeStr } = await recipientTimes(supabase, session);

            // In-app only: we deliberately omit recipient_email so the edge function
            // does not send an email (it will receive an empty address).

            // 1. Notify Student (in-app)
            const { error: errStudent } = await supabase.from('notifications').insert({
                recipient_id: session.student_id,
                recipient_email: '',
                type: 'session_reminder' as any,
                title: 'Starting soon: session in 15 minutes',
                message: `Your session with ${mentor.full_name} starts at ${studentTimeStr}. You can join from the Sessions page when you’re ready.`,
                data: {
                    session_id: session.id,
                    scheduled_at: session.scheduled_at,
                    reminder_window: '15m'
                }
            });
            if (errStudent) insertErrors.push(`student ${session.id}: ${errStudent.message}`);

            // 2. Notify Mentor (in-app)
            const { error: errMentor } = await supabase.from('notifications').insert({
                recipient_id: session.mentor_id,
                recipient_email: '',
                type: 'session_reminder' as any,
                title: 'Starting soon: session in 15 minutes',
                message: `Your session with ${student.full_name} starts at ${mentorTimeStr}. Head to your Sessions page and use Start Session when you’re ready.`,
                data: {
                    session_id: session.id,
                    scheduled_at: session.scheduled_at,
                    reminder_window: '15m'
                }
            });
            if (errMentor) insertErrors.push(`mentor ${session.id}: ${errMentor.message}`);

            // 3. Mark short reminder as sent only if both inserts succeeded
            if (!errStudent && !errMentor) {
                await supabase.from('sessions')
                    .update({ short_reminder_sent: true } as any)
                    .eq('id', session.id);
            }

            sentFifteenMinuteReminders.push({
                session_id: session.id,
                student: student.email,
                mentor: mentor.email
            });
        }
    }

    return NextResponse.json({
        success: true,
        oneHourCount: sentOneHourReminders.length,
        fifteenMinuteCount: sentFifteenMinuteReminders.length,
        oneHourDetails: sentOneHourReminders,
        fifteenMinuteDetails: sentFifteenMinuteReminders,
        ...(insertErrors.length > 0 && { insertErrors })
    });
}
