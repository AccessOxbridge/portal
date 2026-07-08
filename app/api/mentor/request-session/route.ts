import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
    try {
        const supabase = await createClient()

        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('role, full_name')
            .eq('id', user.id)
            .single()

        if (!profile || (profile.role !== 'mentor' && profile.role !== 'admin-dev')) {
            return NextResponse.json({ error: 'Only mentors can request a session.' }, { status: 403 })
        }

        const body = await req.json()
        const { studentId, timeSlot, note, timezone } = body

        if (!studentId || typeof studentId !== 'string') {
            return NextResponse.json({ error: 'Please select a student.' }, { status: 400 })
        }

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

        // Confirm this student is currently assigned to this mentor.
        const { data: assignment } = await supabase
            .from('student_mentor_assignments')
            .select('student_id')
            .eq('mentor_id', user.id)
            .eq('student_id', studentId)
            .eq('is_current', true)
            .maybeSingle()

        if (!assignment) {
            return NextResponse.json(
                { error: 'This student is not currently assigned to you.' },
                { status: 400 }
            )
        }

        // Avoid stacking duplicate pending requests between this mentor/student pair.
        const { data: existingPending } = await supabase
            .from('mentorship_requests')
            .select('id')
            .eq('student_id', studentId)
            .eq('mentor_id', user.id)
            .eq('status', 'pending')
            .maybeSingle()

        if (existingPending) {
            return NextResponse.json(
                { error: 'There is already a pending request between you and this student.' },
                { status: 400 }
            )
        }

        const { error: insertError } = await supabase
            .from('mentorship_requests')
            .insert({
                student_id: studentId,
                mentor_id: user.id,
                initiated_by: 'mentor',
                status: 'pending',
                responses: {
                    timeSlots: [timeSlot],
                    note: note || null,
                    timezone: timezone || null,
                },
            })

        if (insertError) throw insertError

        // Notify the student.
        const { data: studentProfile } = await supabase
            .from('profiles')
            .select('id, email')
            .eq('id', studentId)
            .single()

        if (studentProfile?.email) {
            await supabase.from('notifications').insert({
                recipient_id: studentProfile.id,
                recipient_email: studentProfile.email,
                type: 'mentor_session_request' as const,
                title: 'New Session Request',
                message: `${profile.full_name || 'Your mentor'} has requested a session with you. Review the proposed time in your Pending sessions.`,
                data: {
                    mentor_id: user.id,
                    mentor_name: profile.full_name || 'Mentor',
                },
            })
        }

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('Mentor request-session error:', error)
        return NextResponse.json(
            { error: error.message || 'Internal Server Error' },
            { status: 500 }
        )
    }
}
