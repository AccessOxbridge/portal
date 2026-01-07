import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';

/**
 * CRON API Route: Sends reminders to students and mentors 1 hour before a session starts.
 * Path: /api/cron/reminders
 * 
 * This route should be triggered every 10-15 minutes by a CRON scheduler.
 */
export async function GET(req: Request) {
    // Security check: optional CRON_SECRET from env
    const authHeader = req.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminClient();

    // Calculate window: sessions starting in 45-75 minutes
    const now = new Date();
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
        console.error('Reminder cron error:', fetchError);
        return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!upcomingSessions || upcomingSessions.length === 0) {
        return NextResponse.json({ message: 'No sessions requiring reminders at this time.' });
    }

    const sentReminders = [];

    for (const session of upcomingSessions) {
        const student = session.student as any;
        const mentor = session.mentor as any;

        if (!student || !mentor || !session.scheduled_at) continue;

        const scheduledAt = new Date(session.scheduled_at);
        const timeStr = scheduledAt.toLocaleTimeString('en-GB', {
            hour: '2-digit',
            minute: '2-digit'
        });

        // 1. Notify Student
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

        // 2. Notify Mentor
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

        sentReminders.push({
            session_id: session.id,
            student: student.email,
            mentor: mentor.email
        });
    }

    return NextResponse.json({
        success: true,
        count: sentReminders.length,
        details: sentReminders
    });
}
