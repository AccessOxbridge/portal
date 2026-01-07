'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { createZoomMeeting } from '@/utils/zoom'
// import { sendSessionConfirmationEmail } from '@/utils/email'

interface TimeSlot {
    date: string      // "2025-01-15"
    startTime: string // "14:00"
    endTime: string   // "15:00"
}

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

    if (action === 'reject') {
        const { error } = await supabase
            .from('mentorship_requests')
            .update({ status: 'rejected' })
            .eq('id', requestId)
            .eq('mentor_id', user.id)

        if (error) throw error
    } else {
        // ACCEPT logic - requires selectedSlot
        if (!selectedSlot) {
            throw new Error('A time slot must be selected when accepting a request')
        }

        // 1. Get the request details
        const { data: request, error: fetchError } = await supabase
            .from('mentorship_requests')
            .select('*')
            .eq('id', requestId)
            .single()

        if (fetchError || !request) throw new Error('Request not found')

        // 2. Check if already accepted or expired (24h)
        const createdAt = new Date(request.created_at || Date.now()).getTime()
        const now = new Date().getTime()
        if (now - createdAt > 24 * 60 * 60 * 1000) {
            await supabase.from('mentorship_requests').update({ status: 'expired' }).eq('id', requestId)
            throw new Error('Request has expired (24h window passed)')
        }

        // 3. Parse the selected slot to create a scheduled datetime
        const scheduledAt = new Date(`${selectedSlot.date}T${selectedSlot.startTime}:00`)

        // Calculate duration in minutes
        const startParts = selectedSlot.startTime.split(':').map(Number)
        const endParts = selectedSlot.endTime.split(':').map(Number)
        const durationMinutes = (endParts[0] * 60 + endParts[1]) - (startParts[0] * 60 + startParts[1])

        // 4. Get both profiles for the meeting and emails
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

        // 5. Create Zoom meeting
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

        // 6. Create session with Zoom details
        const { error: sessionError } = await supabase
            .from('sessions')
            .insert({
                student_id: request.student_id,
                mentor_id: request.mentor_id,
                request_id: request.id,
                status: 'active',
                scheduled_at: scheduledAt.toISOString(),
                selected_slot: JSON.parse(JSON.stringify(selectedSlot)),
                zoom_meeting_id: zoomMeeting?.id || null,
                zoom_join_url: zoomMeeting?.joinUrl || null,
                zoom_start_url: zoomMeeting?.startUrl || null,
            })

        if (sessionError) throw sessionError

        // 7. Update request status
        await supabase
            .from('mentorship_requests')
            .update({ status: 'accepted' })
            .eq('id', requestId)

        // 8. Reject other pending requests for this student (since they found a match)
        await supabase
            .from('mentorship_requests')
            .update({ status: 'rejected' })
            .eq('student_id', request.student_id)
            .eq('status', 'pending')

        // 9. Send email/in-app notifications to both parties via notifications table
        const formattedTime = scheduledAt.toLocaleTimeString('en-GB', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
        const formattedDate = scheduledAt.toLocaleDateString('en-GB', {
            weekday: 'long',
            day: 'numeric',
            month: 'long'
        });

        const timeDisplay = `${formattedDate} at ${formattedTime}`;

        // Notification for student
        if (studentProfile?.email) {
            await supabase.from('notifications').insert({
                recipient_id: request.student_id,
                recipient_email: studentProfile.email,
                type: 'match_accepted' as const,
                title: 'Mentorship Request Accepted!',
                message: `Great news! ${mentorProfile?.full_name || 'A mentor'} has accepted your request. Your session is scheduled for ${timeDisplay}.`,
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
                message: `You have successfully scheduled a session with ${studentProfile?.full_name || 'your student'} for ${timeDisplay}.`,
                data: {
                    student_id: request.student_id,
                    student_name: studentProfile?.full_name || 'Student',
                    request_id: request.id,
                    scheduled_at: scheduledAt.toISOString(),
                    zoom_join_url: zoomMeeting?.joinUrl || null,
                }
            })
        }

        // Legacy direct emails (keeping for high-quality template redundancy)
        // if (zoomMeeting) {
        //     if (studentProfile?.email) {
        //         await sendSessionConfirmationEmail({
        //             recipientEmail: studentProfile.email,
        //             recipientName: studentProfile.full_name || 'Student',
        //             otherPartyName: mentorProfile?.full_name || 'Mentor',
        //             otherPartyRole: 'mentor',
        //             scheduledAt,
        //             zoomJoinUrl: zoomMeeting.joinUrl,
        //         })
        //     }

        //     if (mentorProfile?.email) {
        //         await sendSessionConfirmationEmail({
        //             recipientEmail: mentorProfile.email,
        //             recipientName: mentorProfile.full_name || 'Mentor',
        //             otherPartyName: studentProfile?.full_name || 'Student',
        //             otherPartyRole: 'student',
        //             scheduledAt,
        //             zoomJoinUrl: zoomMeeting.joinUrl,
        //         })
        //     }
        // }
    }

    revalidatePath('/dashboard/mentor/requests')
    revalidatePath('/dashboard/student')
}
