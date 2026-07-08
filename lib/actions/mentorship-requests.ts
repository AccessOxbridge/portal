'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { createZoomMeeting } from '@/utils/zoom'
import { sendEmail, EMAIL_SENDER_TEAM } from '@/lib/email/client'
import { sessionConfirmedStudent, sessionConfirmedMentor } from '@/lib/email/templates'
import { formatDateInTz, formatTimeInTz } from '@/lib/timezone'

interface TimeSlot {
    date: string      // "2025-01-15"
    startTime: string // "14:00"
    endTime: string   // "15:00"
}

/**
 * Accept or reject a mentorship_requests row, regardless of who initiated it.
 *
 * A request can be created by either party:
 *   - `initiated_by: 'student'` (default) — the student proposes time slots,
 *     the mentor picks one and accepts/rejects. `selectedSlot` is required.
 *   - `initiated_by: 'mentor'` — the mentor proposes a single fixed time, the
 *     student just accepts/rejects it. `selectedSlot` can be omitted; it is
 *     derived from the single stored slot in `responses.timeSlots[0]`.
 *
 * Whichever party did NOT initiate the request is the "responder" who is
 * authorized to accept/reject it.
 */
export async function handleMentorshipRequest(
    requestId: string,
    action: 'accept' | 'reject',
    selectedSlot?: TimeSlot
) {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) throw new Error('Unauthorized')

    // 0. Fetch the request up front so we know who is allowed to respond.
    const { data: request, error: fetchError } = await supabase
        .from('mentorship_requests')
        .select('*')
        .eq('id', requestId)
        .single()

    if (fetchError || !request) throw new Error('Request not found')

    const initiatedByMentor = request.initiated_by === 'mentor'
    const responderField = initiatedByMentor ? 'student_id' : 'mentor_id'

    if (request[responderField] !== user.id) {
        throw new Error('Unauthorized')
    }

    if (action === 'reject') {
        const { error } = await supabase
            .from('mentorship_requests')
            .update({ status: 'rejected' })
            .eq('id', requestId)

        if (error) throw error
    } else {
        // ACCEPT logic - requires a slot, either passed explicitly (student
        // picking from the mentor's proposed options) or derived from the
        // single slot the mentor proposed (mentor-initiated requests).
        const responses = (request.responses || {}) as { timeSlots?: TimeSlot[] }
        const effectiveSlot = selectedSlot ?? responses.timeSlots?.[0]

        if (!effectiveSlot) {
            throw new Error('A time slot must be selected when accepting a request')
        }

        // 1. Parse the selected slot to create a scheduled datetime.
        // The client sends UTC ISO strings for startTime and endTime.
        const scheduledAt = new Date(effectiveSlot.startTime)
        const endAt = new Date(effectiveSlot.endTime)

        // Calculate duration in minutes using Date objects
        const durationMinutes = Math.round((endAt.getTime() - scheduledAt.getTime()) / (60 * 1000))

        // 2. Get both profiles for the meeting and emails
        const { data: studentProfile } = await supabase
            .from('profiles')
            .select('full_name, email')
            .eq('id', request.student_id)
            .single()

        const { data: mentorProfile } = await supabase
            .from('profiles')
            .select('full_name, email')
            .eq('id', request.mentor_id)
            .single()

        // Timezones for per-recipient date/time formatting (student tz lives on
        // student_profiles, mentor tz on mentors). Fall back handled downstream.
        const { data: studentTzRow } = await supabase
            .from('student_profiles')
            .select('timezone')
            .eq('id', request.student_id)
            .maybeSingle()
        const studentTz = studentTzRow?.timezone ?? null

        const { data: mentorTzRow } = await supabase
            .from('mentors')
            .select('timezone')
            .eq('id', request.mentor_id)
            .maybeSingle()
        const mentorTz = (mentorTzRow as { timezone?: string | null } | null)?.timezone ?? null

        // 3. Create Zoom meeting
        let zoomMeeting: { id: string; joinUrl: string; startUrl: string } | null = null
        try {
            zoomMeeting = await createZoomMeeting({
                topic: `Mentorship Session: ${studentProfile?.full_name || 'Student'} & ${mentorProfile?.full_name || 'Mentor'}`,
                startTime: scheduledAt,
                duration: durationMinutes > 0 ? durationMinutes : 60,
            })
        } catch (zoomError) {
            console.error('Failed to create Zoom meeting:', zoomError)
            // Continue without Zoom if it fails - we can add manually later
        }

        // 4. Create session with Zoom details
        const { error: sessionError } = await supabase
            .from('sessions')
            .insert({
                student_id: request.student_id,
                mentor_id: request.mentor_id,
                request_id: request.id,
                status: 'active',
                scheduled_at: scheduledAt.toISOString(),
                duration_minutes: durationMinutes > 0 ? durationMinutes : 60,
                selected_slot: JSON.parse(JSON.stringify(effectiveSlot)),
                zoom_meeting_id: zoomMeeting?.id || null,
                zoom_join_url: zoomMeeting?.joinUrl || null,
                zoom_start_url: zoomMeeting?.startUrl || null,
            })

        if (sessionError) throw sessionError

        // 5. Update request status
        await supabase
            .from('mentorship_requests')
            .update({ status: 'accepted' })
            .eq('id', requestId)

        // 6. Reject other pending requests for this student (since they found a match)
        await supabase
            .from('mentorship_requests')
            .update({ status: 'rejected' })
            .eq('student_id', request.student_id)
            .eq('status', 'pending')

        // 7. Send email/in-app notifications to both parties via notifications table.
        //    Each recipient sees the time in their own timezone (with label).
        const dateOpts: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long' }
        const studentDate = formatDateInTz(scheduledAt, studentTz, dateOpts)
        const studentTime = formatTimeInTz(scheduledAt, studentTz, { withZone: true })
        const studentTimeDisplay = `${studentDate} at ${studentTime}`

        const mentorDate = formatDateInTz(scheduledAt, mentorTz, dateOpts)
        const mentorTime = formatTimeInTz(scheduledAt, mentorTz, { withZone: true })
        const mentorTimeDisplay = `${mentorDate} at ${mentorTime}`

        // Notification for student — wording works regardless of who booked.
        if (studentProfile?.email) {
            await supabase.from('notifications').insert({
                recipient_id: request.student_id,
                recipient_email: studentProfile.email,
                type: 'match_accepted' as const,
                title: 'Session Confirmed!',
                message: initiatedByMentor
                    ? `Your session with ${mentorProfile?.full_name || 'your mentor'} is confirmed for ${studentTimeDisplay}.`
                    : `Great news! ${mentorProfile?.full_name || 'A mentor'} has accepted your request. Your session is scheduled for ${studentTimeDisplay}.`,
                data: {
                    mentor_id: request.mentor_id,
                    mentor_name: mentorProfile?.full_name || 'Mentor',
                    request_id: request.id,
                    scheduled_at: scheduledAt.toISOString(),
                    zoom_join_url: zoomMeeting?.joinUrl || null,
                }
            })
        }

        // Notification for mentor
        if (mentorProfile?.email) {
            await supabase.from('notifications').insert({
                recipient_id: request.mentor_id,
                recipient_email: mentorProfile.email,
                type: 'session_confirmed' as const,
                title: 'Session Confirmed!',
                message: initiatedByMentor
                    ? `${studentProfile?.full_name || 'Your student'} has accepted your session request. Your session is scheduled for ${mentorTimeDisplay}.`
                    : `You have successfully scheduled a session with ${studentProfile?.full_name || 'your student'} for ${mentorTimeDisplay}.`,
                data: {
                    student_id: request.student_id,
                    student_name: studentProfile?.full_name || 'Student',
                    request_id: request.id,
                    scheduled_at: scheduledAt.toISOString(),
                    zoom_join_url: zoomMeeting?.joinUrl || null,
                }
            })
        }

        // 8. Branded "session confirmed" emails to both parties. Email failures
        //    must not roll back the confirmed session.
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
    }

    revalidatePath('/dashboard/mentor/requests')
    revalidatePath('/dashboard/mentor')
    revalidatePath('/dashboard/mentor/sessions')
    revalidatePath('/dashboard/mentor/students')
    revalidatePath('/dashboard/student')
    revalidatePath('/dashboard/student/sessions')
}
