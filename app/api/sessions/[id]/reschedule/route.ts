import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'
import { sendEmail, EMAIL_SENDER_TEAM } from '@/lib/email/client'
import {
    sessionRescheduleRequestedStudent,
    sessionRescheduleRequestedMentor,
} from '@/lib/email/templates'
import { formatSessionWhen } from '@/lib/session-reschedule'

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: sessionId } = await params
        const supabase = await createClient()

        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await req.json()
        const { timeSlot, note, timezone } = body

        if (!timeSlot || !timeSlot.date || !timeSlot.startTime || !timeSlot.endTime) {
            return NextResponse.json({ error: 'Please provide a proposed date and time.' }, { status: 400 })
        }

        const start = new Date(timeSlot.startTime)
        const end = new Date(timeSlot.endTime)
        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
            return NextResponse.json({ error: 'Invalid time slot.' }, { status: 400 })
        }

        if (start.getTime() <= Date.now()) {
            return NextResponse.json({ error: 'Please propose a time in the future.' }, { status: 400 })
        }

        const { data: session, error: sessionError } = await supabase
            .from('sessions')
            .select('id, student_id, mentor_id, status, scheduled_at, zoom_meeting_status, duration_minutes')
            .eq('id', sessionId)
            .single()

        if (sessionError || !session) {
            return NextResponse.json({ error: 'Session not found.' }, { status: 404 })
        }

        const isStudent = session.student_id === user.id
        const isMentor = session.mentor_id === user.id

        if (!isStudent && !isMentor) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
        }

        if (session.status !== 'active') {
            return NextResponse.json({ error: 'Only active sessions can be rescheduled.' }, { status: 400 })
        }

        if (!session.scheduled_at || new Date(session.scheduled_at).getTime() <= Date.now()) {
            return NextResponse.json(
                { error: 'Current or past sessions cannot be rescheduled.' },
                { status: 400 }
            )
        }

        if (session.zoom_meeting_status === 'started') {
            return NextResponse.json(
                { error: 'This session has already started and cannot be rescheduled.' },
                { status: 400 }
            )
        }

        const { data: existingReschedule } = await supabase
            .from('mentorship_requests')
            .select('id')
            .eq('reschedule_of_session_id', sessionId)
            .eq('status', 'pending')
            .maybeSingle()

        if (existingReschedule) {
            return NextResponse.json(
                { error: 'There is already a pending reschedule request for this session.' },
                { status: 400 }
            )
        }

        const initiatedBy = isMentor ? 'mentor' : 'student'

        const { data: inserted, error: insertError } = await supabase
            .from('mentorship_requests')
            .insert({
                student_id: session.student_id,
                mentor_id: session.mentor_id,
                initiated_by: initiatedBy,
                status: 'pending',
                reschedule_of_session_id: sessionId,
                responses: {
                    timeSlots: [timeSlot],
                    note: note || null,
                    timezone: timezone || null,
                    original_scheduled_at: session.scheduled_at,
                },
            })
            .select('id')
            .single()

        if (insertError) {
            if (insertError.code === '23505') {
                return NextResponse.json(
                    { error: 'There is already a pending reschedule request for this session.' },
                    { status: 400 }
                )
            }
            throw insertError
        }

        const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name, email')
            .in('id', [session.student_id, session.mentor_id])

        const studentProfile = profiles?.find((p) => p.id === session.student_id)
        const mentorProfile = profiles?.find((p) => p.id === session.mentor_id)

        const { data: studentTzRow } = await supabase
            .from('student_profiles')
            .select('timezone')
            .eq('id', session.student_id)
            .maybeSingle()
        const studentTz = studentTzRow?.timezone ?? null

        const { data: mentorTzRow } = await supabase
            .from('mentors')
            .select('timezone')
            .eq('id', session.mentor_id)
            .maybeSingle()
        const mentorTz = (mentorTzRow as { timezone?: string | null } | null)?.timezone ?? null

        const studentOriginal = formatSessionWhen(session.scheduled_at, studentTz)
        const studentProposed = formatSessionWhen(timeSlot.startTime, studentTz)
        const mentorOriginal = formatSessionWhen(session.scheduled_at, mentorTz)
        const mentorProposed = formatSessionWhen(timeSlot.startTime, mentorTz)

        const otherPartyId = isMentor ? session.student_id : session.mentor_id
        const otherProfile = isMentor ? studentProfile : mentorProfile
        const proposerName = isMentor
            ? mentorProfile?.full_name || 'Your mentor'
            : studentProfile?.full_name || 'Your student'

        if (otherProfile?.email) {
            await supabase.from('notifications').insert({
                recipient_id: otherPartyId,
                recipient_email: otherProfile.email,
                type: 'session_reschedule_request' as const,
                title: 'Reschedule Request',
                message: `${proposerName} has requested to reschedule your upcoming session. Review it in Pending.`,
                data: {
                    request_id: inserted.id,
                    session_id: sessionId,
                    proposed_start: timeSlot.startTime,
                    original_scheduled_at: session.scheduled_at,
                },
            })
        }

        try {
            if (studentProfile?.email) {
                const tpl = sessionRescheduleRequestedStudent(
                    studentProfile.full_name || '',
                    mentorProfile?.full_name || '',
                    {
                        originalDate: studentOriginal.date,
                        originalTime: studentOriginal.time,
                        proposedDate: studentProposed.date,
                        proposedTime: studentProposed.time,
                    },
                    initiatedBy
                )
                await sendEmail({
                    from: EMAIL_SENDER_TEAM,
                    to: studentProfile.email,
                    subject: tpl.subject,
                    html: tpl.html,
                })
            }
            if (mentorProfile?.email) {
                const tpl = sessionRescheduleRequestedMentor(
                    mentorProfile.full_name || '',
                    studentProfile?.full_name || '',
                    {
                        originalDate: mentorOriginal.date,
                        originalTime: mentorOriginal.time,
                        proposedDate: mentorProposed.date,
                        proposedTime: mentorProposed.time,
                    },
                    initiatedBy
                )
                await sendEmail({
                    from: EMAIL_SENDER_TEAM,
                    to: mentorProfile.email,
                    subject: tpl.subject,
                    html: tpl.html,
                })
            }
        } catch (emailError) {
            console.error('Reschedule request email error:', emailError)
        }

        return NextResponse.json({ success: true, requestId: inserted.id })
    } catch (error: unknown) {
        console.error('Session reschedule error:', error)
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal Server Error' },
            { status: 500 }
        )
    }
}
