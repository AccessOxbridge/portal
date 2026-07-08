import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { createZoomMeeting } from '@/utils/zoom'
import { sendEmail, EMAIL_SENDER_TEAM } from '@/lib/email/client'
import { sessionConfirmedStudent, sessionConfirmedMentor } from '@/lib/email/templates'
import { formatDateInTz, formatTimeInTz } from '@/lib/timezone'

interface TimeSlot {
    date: string
    startTime: string
    endTime: string
}

/**
 * Admin directly books a confirmed session between an already-assigned
 * mentor/student pair, skipping the request/accept flow entirely. Both
 * parties receive the same "session confirmed" notifications and branded
 * emails as the normal booking flow.
 */
export async function POST(req: Request) {
    try {
        const supabase = await createClient()
        const adminSupabase = createAdminClient()

        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        if (!profile || !['admin', 'admin-dev'].includes(profile.role)) {
            return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
        }

        const body = await req.json().catch(() => null)
        const studentId = body?.studentId as string | undefined
        const mentorId = body?.mentorId as string | undefined
        const timeSlot = body?.timeSlot as TimeSlot | undefined

        if (!studentId || !mentorId) {
            return NextResponse.json(
                { error: 'studentId and mentorId are required' },
                { status: 400 }
            )
        }

        if (!timeSlot || !timeSlot.date || !timeSlot.startTime || !timeSlot.endTime) {
            return NextResponse.json({ error: 'Please provide a date and time.' }, { status: 400 })
        }

        const scheduledAt = new Date(timeSlot.startTime)
        const endAt = new Date(timeSlot.endTime)

        if (Number.isNaN(scheduledAt.getTime()) || Number.isNaN(endAt.getTime()) || endAt <= scheduledAt) {
            return NextResponse.json({ error: 'Invalid time slot.' }, { status: 400 })
        }

        if (scheduledAt.getTime() <= Date.now()) {
            return NextResponse.json({ error: 'Please choose a time in the future.' }, { status: 400 })
        }

        // Confirm this is a currently-assigned pair (defense in depth; the UI
        // should already only offer assigned pairs).
        const { data: assignment } = await adminSupabase
            .from('student_mentor_assignments')
            .select('student_id')
            .eq('student_id', studentId)
            .eq('mentor_id', mentorId)
            .eq('is_current', true)
            .maybeSingle()

        if (!assignment) {
            return NextResponse.json(
                { error: 'This student is not currently assigned to this mentor.' },
                { status: 400 }
            )
        }

        const durationMinutes = Math.round((endAt.getTime() - scheduledAt.getTime()) / (60 * 1000))

        const { data: studentProfile } = await adminSupabase
            .from('profiles')
            .select('full_name, email')
            .eq('id', studentId)
            .single()

        const { data: mentorProfile } = await adminSupabase
            .from('profiles')
            .select('full_name, email')
            .eq('id', mentorId)
            .single()

        const { data: studentTzRow } = await adminSupabase
            .from('student_profiles')
            .select('timezone')
            .eq('id', studentId)
            .maybeSingle()
        const studentTz = studentTzRow?.timezone ?? null

        const { data: mentorTzRow } = await adminSupabase
            .from('mentors')
            .select('timezone')
            .eq('id', mentorId)
            .maybeSingle()
        const mentorTz = (mentorTzRow as { timezone?: string | null } | null)?.timezone ?? null

        let zoomMeeting: { id: string; joinUrl: string; startUrl: string } | null = null
        try {
            zoomMeeting = await createZoomMeeting({
                topic: `Mentorship Session: ${studentProfile?.full_name || 'Student'} & ${mentorProfile?.full_name || 'Mentor'}`,
                startTime: scheduledAt,
                duration: durationMinutes > 0 ? durationMinutes : 60,
            })
        } catch (zoomError) {
            console.error('Failed to create Zoom meeting:', zoomError)
            // Continue without Zoom if it fails - can be added manually later.
        }

        const { error: sessionError } = await adminSupabase
            .from('sessions')
            .insert({
                student_id: studentId,
                mentor_id: mentorId,
                request_id: null,
                status: 'active',
                scheduled_at: scheduledAt.toISOString(),
                duration_minutes: durationMinutes > 0 ? durationMinutes : 60,
                selected_slot: JSON.parse(JSON.stringify(timeSlot)),
                zoom_meeting_id: zoomMeeting?.id || null,
                zoom_join_url: zoomMeeting?.joinUrl || null,
                zoom_start_url: zoomMeeting?.startUrl || null,
            })

        if (sessionError) throw sessionError

        // Clear out any stale pending requests for this student so nothing
        // contradicts the now-confirmed session.
        await adminSupabase
            .from('mentorship_requests')
            .update({ status: 'rejected' })
            .eq('student_id', studentId)
            .eq('status', 'pending')

        const dateOpts: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long' }
        const studentDate = formatDateInTz(scheduledAt, studentTz, dateOpts)
        const studentTime = formatTimeInTz(scheduledAt, studentTz, { withZone: true })
        const studentTimeDisplay = `${studentDate} at ${studentTime}`

        const mentorDate = formatDateInTz(scheduledAt, mentorTz, dateOpts)
        const mentorTime = formatTimeInTz(scheduledAt, mentorTz, { withZone: true })
        const mentorTimeDisplay = `${mentorDate} at ${mentorTime}`

        if (studentProfile?.email) {
            await adminSupabase.from('notifications').insert({
                recipient_id: studentId,
                recipient_email: studentProfile.email,
                type: 'match_accepted' as const,
                title: 'Session Confirmed!',
                message: `A session with ${mentorProfile?.full_name || 'your mentor'} has been booked for ${studentTimeDisplay}.`,
                data: {
                    mentor_id: mentorId,
                    mentor_name: mentorProfile?.full_name || 'Mentor',
                    scheduled_at: scheduledAt.toISOString(),
                    zoom_join_url: zoomMeeting?.joinUrl || null,
                }
            })
        }

        if (mentorProfile?.email) {
            await adminSupabase.from('notifications').insert({
                recipient_id: mentorId,
                recipient_email: mentorProfile.email,
                type: 'session_confirmed' as const,
                title: 'Session Confirmed!',
                message: `A session with ${studentProfile?.full_name || 'your student'} has been booked for ${mentorTimeDisplay}.`,
                data: {
                    student_id: studentId,
                    student_name: studentProfile?.full_name || 'Student',
                    scheduled_at: scheduledAt.toISOString(),
                    zoom_join_url: zoomMeeting?.joinUrl || null,
                }
            })
        }

        try {
            const zoomLink = zoomMeeting?.joinUrl || null

            if (studentProfile?.email) {
                const tpl = sessionConfirmedStudent(
                    studentProfile.full_name || '',
                    mentorProfile?.full_name || '',
                    { date: studentDate, time: studentTime, zoomLink }
                )
                await sendEmail({
                    from: EMAIL_SENDER_TEAM,
                    to: studentProfile.email,
                    subject: tpl.subject,
                    html: tpl.html,
                })
            }

            if (mentorProfile?.email) {
                const tpl = sessionConfirmedMentor(
                    mentorProfile.full_name || '',
                    studentProfile?.full_name || '',
                    { date: mentorDate, time: mentorTime, zoomLink }
                )
                await sendEmail({
                    from: EMAIL_SENDER_TEAM,
                    to: mentorProfile.email,
                    subject: tpl.subject,
                    html: tpl.html,
                })
            }
        } catch (emailError) {
            console.error('Session confirmation email error:', emailError)
        }

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('Admin book session error:', error)
        return NextResponse.json(
            { error: error?.message || 'Failed to book session' },
            { status: 500 }
        )
    }
}
