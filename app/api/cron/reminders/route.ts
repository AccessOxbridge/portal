import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';

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
    // Security check: optional CRON_SECRET from env
    const authHeader = req.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
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

            const scheduledAt = new Date(session.scheduled_at);
            const timeStr = scheduledAt.toLocaleTimeString('en-GB', {
                hour: '2-digit',
                minute: '2-digit'
            });

            // 1. Notify Student (email + in-app)
            await supabase.from('notifications').insert({
                recipient_id: session.student_id,
                recipient_email: student.email,
                type: 'session_reminder' as any,
                title: 'Reminder: Mentorship Session in 1 hour!',
                message: `Your session with ${mentor.full_name} starts at ${timeStr}. See you soon!`,
                data: {
                    session_id: session.id,
                    zoom_join_url: session.zoom_join_url,
                    scheduled_at: session.scheduled_at
                }
            });

            // 2. Notify Mentor (email + in-app)
            await supabase.from('notifications').insert({
                recipient_id: session.mentor_id,
                recipient_email: mentor.email,
                type: 'session_reminder' as any,
                title: 'Reminder: Mentorship Session in 1 hour!',
                message: `Your session with ${student.full_name} starts at ${timeStr}. Ready?`,
                data: {
                    session_id: session.id,
                    zoom_start_url: session.zoom_start_url || session.zoom_join_url,
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

    if (shortSessions && shortSessions.length > 0) {
        for (const session of shortSessions) {
            const student = session.student as any;
            const mentor = session.mentor as any;

            if (!student || !mentor || !session.scheduled_at) continue;

            const scheduledAt = new Date(session.scheduled_at);
            const timeStr = scheduledAt.toLocaleTimeString('en-GB', {
                hour: '2-digit',
                minute: '2-digit'
            });

            // In-app only: we deliberately omit recipient_email so the edge function
            // does not send an email (it will receive an empty address).

            // 1. Notify Student (in-app)
            await supabase.from('notifications').insert({
                recipient_id: session.student_id,
                recipient_email: '',
                type: 'session_reminder' as any,
                title: 'Starting soon: session in 15 minutes',
                message: `Your session with ${mentor.full_name} starts at ${timeStr}. You can join from the Sessions page when you’re ready.`,
                data: {
                    session_id: session.id,
                    zoom_join_url: session.zoom_join_url,
                    scheduled_at: session.scheduled_at,
                    reminder_window: '15m'
                }
            });

            // 2. Notify Mentor (in-app)
            await supabase.from('notifications').insert({
                recipient_id: session.mentor_id,
                recipient_email: '',
                type: 'session_reminder' as any,
                title: 'Starting soon: session in 15 minutes',
                message: `Your session with ${student.full_name} starts at ${timeStr}. Head to Zoom when you’re ready.`,
                data: {
                    session_id: session.id,
                    zoom_start_url: session.zoom_start_url || session.zoom_join_url,
                    scheduled_at: session.scheduled_at,
                    reminder_window: '15m'
                }
            });

            // 3. Mark short reminder as sent
            await supabase.from('sessions')
                .update({ short_reminder_sent: true } as any)
                .eq('id', session.id);

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
        fifteenMinuteDetails: sentFifteenMinuteReminders
    });
}
