'use server'

import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { revalidatePath } from 'next/cache'
import { createZoomMeeting, deleteZoomMeeting } from '@/utils/zoom'
import { sendEmail, EMAIL_SENDER_TEAM } from '@/lib/email/client'
import {
    sessionConfirmedStudent,
    sessionConfirmedMentor,
    sessionRescheduleAcceptedStudent,
    sessionRescheduleAcceptedMentor,
} from '@/lib/email/templates'
import { formatDateInTz, formatTimeInTz } from '@/lib/timezone'
import { notifyRescheduleDeclined } from '@/lib/session-reschedule'
import { notifyAdminsOfSessionClash } from '@/lib/session-clash-notify'

interface TimeSlot {
    date: string      // "2025-01-15"
    startTime: string // UTC ISO or wall time
    endTime: string
}

/**
 * Accept or reject a mentorship_requests row, regardless of who initiated it.
 *
 * A request can be created by either party:
 *   - `initiated_by: 'student'` (default) — the student proposes time slots,
 *     the mentor picks one and accepts/rejects. `selectedSlot` is required
 *     (unless this is a single-slot reschedule).
 *   - `initiated_by: 'mentor'` — the mentor proposes a single fixed time, the
 *     student just accepts/rejects it. `selectedSlot` can be omitted; it is
 *     derived from the single stored slot in `responses.timeSlots[0]`.
 *
 * When `reschedule_of_session_id` is set, accept cancels the original upcoming
 * session and creates a new one; reject leaves the original intact and emails
 * both parties.
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

    const isReschedule = !!request.reschedule_of_session_id
    const responses = (request.responses || {}) as {
        timeSlots?: TimeSlot[]
        original_scheduled_at?: string
    }

    if (action === 'reject') {
        const { error } = await supabase
            .from('mentorship_requests')
            .update({ status: 'rejected' })
            .eq('id', requestId)

        if (error) throw error

        if (isReschedule) {
            let originalScheduledAt = responses.original_scheduled_at ?? null
            if (!originalScheduledAt && request.reschedule_of_session_id) {
                const { data: originalSession } = await supabase
                    .from('sessions')
                    .select('scheduled_at')
                    .eq('id', request.reschedule_of_session_id)
                    .maybeSingle()
                originalScheduledAt = originalSession?.scheduled_at ?? null
            }

            await notifyRescheduleDeclined({
                supabase,
                studentId: request.student_id,
                mentorId: request.mentor_id,
                originalScheduledAt,
                withdrawnByProposer: false,
            })
        }
    } else {
        const effectiveSlot = selectedSlot ?? responses.timeSlots?.[0]

        if (!effectiveSlot) {
            throw new Error('A time slot must be selected when accepting a request')
        }

        const scheduledAt = new Date(effectiveSlot.startTime)
        const endAt = new Date(effectiveSlot.endTime)
        const durationMinutes = Math.round((endAt.getTime() - scheduledAt.getTime()) / (60 * 1000))

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

        // Provision the replacement meeting BEFORE touching the original.
        //
        // A reschedule cancels the original session and deletes its Zoom
        // meeting, and deleting a Zoom meeting cannot be undone. Creating the
        // new meeting first means a Zoom outage leaves the original session
        // completely intact instead of destroying a working booking and
        // replacing it with one that has no meeting attached.
        let zoomMeeting: { id: string; joinUrl: string; startUrl: string }
        try {
            zoomMeeting = await createZoomMeeting({
                topic: `Mentorship Session: ${studentProfile?.full_name || 'Student'} & ${mentorProfile?.full_name || 'Mentor'}`,
                startTime: scheduledAt,
                duration: durationMinutes > 0 ? durationMinutes : 60,
            })
        } catch (zoomError) {
            console.error('[mentorship-request] Zoom meeting creation failed; nothing was changed:', zoomError)
            throw new Error(
                'We could not set up the video call for this session, so it has not been booked. Please try again in a moment.'
            )
        }

        // Reschedule, part 1 of 2: VALIDATE ONLY. Nothing is destroyed here.
        //
        // The original session is cancelled and its Zoom meeting deleted only
        // AFTER the replacement row exists (part 2, below). Deleting a Zoom
        // meeting cannot be undone, so it must be the last thing that happens,
        // never something that has already happened when a later step fails.
        //
        // On 2026-09-15 the old ordering — cancel and delete, THEN insert —
        // destroyed a live student session when the insert was rejected. The
        // original was gone, the replacement never existed, and the student's
        // join link returned "This meeting link is invalid (3,001)".
        let originalSession: {
            id: string
            zoom_meeting_id: string | null
        } | null = null

        if (isReschedule && request.reschedule_of_session_id) {
            try {
                const admin = createAdminClient()
                const { data: original, error: originalError } = await admin
                    .from('sessions')
                    .select('id, status, scheduled_at, zoom_meeting_id, zoom_meeting_status')
                    .eq('id', request.reschedule_of_session_id)
                    .single()

                if (originalError || !original) {
                    throw new Error('Original session not found')
                }

                const stillUpcoming =
                    original.status === 'active' &&
                    original.scheduled_at &&
                    new Date(original.scheduled_at).getTime() > Date.now() &&
                    original.zoom_meeting_status !== 'started'

                if (!stillUpcoming) {
                    await supabase
                        .from('mentorship_requests')
                        .update({ status: 'rejected' })
                        .eq('id', requestId)

                    throw new Error(
                        'The original session is no longer upcoming, so this reschedule cannot be accepted.'
                    )
                }

                originalSession = {
                    id: original.id,
                    zoom_meeting_id: original.zoom_meeting_id,
                }
            } catch (rescheduleError) {
                // Validation failed, so the replacement meeting we created a
                // moment ago is orphaned. Remove it. The original session is
                // untouched — the student's existing link still works.
                await deleteZoomMeeting(zoomMeeting.id)
                throw rescheduleError
            }
        }

        const admin = createAdminClient()
        const { data: createdSession, error: sessionError } = await admin
            .from('sessions')
            .insert({
                student_id: request.student_id,
                mentor_id: request.mentor_id,
                request_id: request.id,
                status: 'active',
                scheduled_at: scheduledAt.toISOString(),
                duration_minutes: durationMinutes > 0 ? durationMinutes : 60,
                selected_slot: JSON.parse(JSON.stringify(effectiveSlot)),
                zoom_meeting_id: zoomMeeting.id,
                zoom_join_url: zoomMeeting.joinUrl,
                zoom_start_url: zoomMeeting.startUrl,
            })
            .select('id')
            .single()

        if (sessionError) {
            // The meeting we just created now has no session to belong to.
            // For a reschedule this is the critical case: the original session
            // is still active and still has its Zoom meeting, because we have
            // not touched it yet. The student keeps a working booking.
            await deleteZoomMeeting(zoomMeeting.id)
            throw sessionError
        }

        // Reschedule, part 2 of 2: the replacement exists, so it is now safe to
        // retire the original. Anything failing from here leaves two sessions
        // rather than none — recoverable, unlike the reverse.
        if (originalSession) {
            const nowIso = new Date().toISOString()
            const { error: cancelError } = await admin
                .from('sessions')
                .update({ status: 'cancelled', updated_at: nowIso })
                .eq('id', originalSession.id)

            if (cancelError) {
                // Loud: the student now has two active sessions for one slot.
                // Safe, but an admin needs to cancel one by hand.
                console.error(
                    `[mentorship-request] Replacement ${createdSession?.id} created but could ` +
                        `not cancel original ${originalSession.id}. Both are now active:`,
                    cancelError
                )
            } else if (originalSession.zoom_meeting_id) {
                // Only delete the old meeting once the row is actually
                // cancelled — otherwise an active session loses its link.
                await deleteZoomMeeting(originalSession.zoom_meeting_id)
            }
        }

        await supabase
            .from('mentorship_requests')
            .update({ status: 'accepted' })
            .eq('id', requestId)

        // New bookings reject other pending requests for the student.
        // Reschedules must not — they would kill unrelated booking requests.
        if (!isReschedule) {
            await supabase
                .from('mentorship_requests')
                .update({ status: 'rejected' })
                .eq('student_id', request.student_id)
                .eq('status', 'pending')
        }

        const dateOpts: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long' }
        const studentDate = formatDateInTz(scheduledAt, studentTz, dateOpts)
        const studentTime = formatTimeInTz(scheduledAt, studentTz, { withZone: true })
        const studentTimeDisplay = `${studentDate} at ${studentTime}`

        const mentorDate = formatDateInTz(scheduledAt, mentorTz, dateOpts)
        const mentorTime = formatTimeInTz(scheduledAt, mentorTz, { withZone: true })
        const mentorTimeDisplay = `${mentorDate} at ${mentorTime}`

        if (isReschedule) {
            if (studentProfile?.email) {
                await supabase.from('notifications').insert({
                    recipient_id: request.student_id,
                    recipient_email: studentProfile.email,
                    type: 'session_reschedule_accepted' as const,
                    title: 'Session Rescheduled!',
                    message: `Your session with ${mentorProfile?.full_name || 'your mentor'} has been moved to ${studentTimeDisplay}.`,
                    data: {
                        mentor_id: request.mentor_id,
                        mentor_name: mentorProfile?.full_name || 'Mentor',
                        request_id: request.id,
                        session_id: createdSession?.id || null,
                        scheduled_at: scheduledAt.toISOString(),
                    },
                })
            }

            if (mentorProfile?.email) {
                await supabase.from('notifications').insert({
                    recipient_id: request.mentor_id,
                    recipient_email: mentorProfile.email,
                    type: 'session_reschedule_accepted' as const,
                    title: 'Session Rescheduled!',
                    message: `Your session with ${studentProfile?.full_name || 'your student'} has been moved to ${mentorTimeDisplay}.`,
                    data: {
                        student_id: request.student_id,
                        student_name: studentProfile?.full_name || 'Student',
                        request_id: request.id,
                        session_id: createdSession?.id || null,
                        scheduled_at: scheduledAt.toISOString(),
                    },
                })
            }

            try {
                if (studentProfile?.email) {
                    const tpl = sessionRescheduleAcceptedStudent(
                        studentProfile.full_name || '',
                        mentorProfile?.full_name || '',
                        { date: studentDate, time: studentTime }
                    )
                    await sendEmail({
                        from: EMAIL_SENDER_TEAM,
                        to: studentProfile.email,
                        subject: tpl.subject,
                        html: tpl.html,
                    })
                }

                if (mentorProfile?.email) {
                    const tpl = sessionRescheduleAcceptedMentor(
                        mentorProfile.full_name || '',
                        studentProfile?.full_name || '',
                        { date: mentorDate, time: mentorTime }
                    )
                    await sendEmail({
                        from: EMAIL_SENDER_TEAM,
                        to: mentorProfile.email,
                        subject: tpl.subject,
                        html: tpl.html,
                    })
                }
            } catch (emailError) {
                console.error('Session reschedule acceptance email error:', emailError)
            }
        } else {
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
                        session_id: createdSession?.id || null,
                        scheduled_at: scheduledAt.toISOString(),
                    },
                })
            }

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
                        session_id: createdSession?.id || null,
                        scheduled_at: scheduledAt.toISOString(),
                    },
                })
            }

            try {
                if (studentProfile?.email) {
                    const tpl = sessionConfirmedStudent(
                        studentProfile.full_name || '',
                        mentorProfile?.full_name || '',
                        { date: studentDate, time: studentTime }
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
                        { date: mentorDate, time: mentorTime }
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

        // Alert admins if this session lands on top of an unrelated one.
        if (createdSession?.id) {
            await notifyAdminsOfSessionClash(admin, {
                sessionId: createdSession.id,
                studentId: request.student_id,
                mentorId: request.mentor_id,
                scheduledAt: scheduledAt.toISOString(),
                durationMinutes: durationMinutes > 0 ? durationMinutes : 60,
            })
        }
    }

    revalidatePath('/dashboard/mentor/requests')
    revalidatePath('/dashboard/mentor')
    revalidatePath('/dashboard/mentor/sessions')
    revalidatePath('/dashboard/mentor/students')
    revalidatePath('/dashboard/student')
    revalidatePath('/dashboard/student/sessions')
}
