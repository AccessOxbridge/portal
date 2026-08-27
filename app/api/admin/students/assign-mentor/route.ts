import { sendMatchIntroMessage } from '@/lib/claire-auto-messages'
import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { sendEmail, EMAIL_SENDER_CLAIRE } from '@/lib/email/client'
import { studentMatched, mentorMatched } from '@/lib/email/templates'

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
        const studentId = body?.student_id as string | undefined
        const newMentorId = body?.mentor_id as string | undefined

        if (!studentId || !newMentorId) {
            return NextResponse.json(
                { error: 'student_id and mentor_id are required' },
                { status: 400 }
            )
        }

        // A student can have several mentors at once, but not the same mentor twice.
        const { data: existingAssignment } = await adminSupabase
            .from('student_mentor_assignments')
            .select('id')
            .eq('student_id', studentId)
            .eq('mentor_id', newMentorId)
            .eq('is_current', true)
            .maybeSingle()

        if (existingAssignment) {
            // Heal a missed intro if the pair was assigned before this code ran,
            // or if the request hit a deploy that created the assignment only.
            await sendMatchIntroMessage({
                studentId,
                mentorId: newMentorId,
            })
            return NextResponse.json(
                { error: 'This student is already assigned to that mentor.' },
                { status: 400 }
            )
        }

        // Add the new assignment alongside any other current mentors.
        const { error: insertError } = await adminSupabase
            .from('student_mentor_assignments')
            .insert({
                student_id: studentId,
                mentor_id: newMentorId,
                assigned_by: user.id,
                is_current: true,
            })

        if (insertError) {
            return NextResponse.json(
                { error: 'Failed to create mentor assignment' },
                { status: 500 }
            )
        }

        // Chat intro first so a slow/failing match email cannot skip it.
        await sendMatchIntroMessage({
            studentId,
            mentorId: newMentorId,
        })

        // Notify student + new mentor.
        const ids = [studentId, newMentorId]
        const { data: profiles } = await adminSupabase
            .from('profiles')
            .select('id, full_name, email')
            .in('id', ids)

        const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]))
        const studentProfile = profileMap.get(studentId)
        const newMentorProfile = profileMap.get(newMentorId)

        const studentName = studentProfile?.full_name || 'the student'
        const newMentorName = newMentorProfile?.full_name || 'a mentor'

        const notifications: any[] = []

        if (studentProfile?.email) {
            notifications.push({
                recipient_id: studentId,
                recipient_email: studentProfile.email,
                type: 'system_alert' as const,
                title: 'Your mentor has been assigned',
                message: `You have been assigned to ${newMentorName}. You can now book a session and start chatting with your mentor.`,
                data: {
                    student_id: studentId,
                    new_mentor_id: newMentorId,
                },
            })
        }

        if (newMentorProfile?.email) {
            notifications.push({
                recipient_id: newMentorId,
                recipient_email: newMentorProfile.email,
                type: 'system_alert' as const,
                title: 'You have a new assigned student',
                message: `You have been assigned as a mentor for ${studentName}. They may book a session with you soon.`,
                data: {
                    student_id: studentId,
                    new_mentor_id: newMentorId,
                },
            })
        }

        if (notifications.length > 0) {
            await adminSupabase.from('notifications').insert(notifications)
        }

        // Branded "you've been matched" emails (from Claire). These fire on
        // every new assignment. Email failures must not fail the assignment itself.
        try {
            if (studentProfile?.email) {
                const tpl = studentMatched(studentProfile.full_name || '', newMentorName)
                await sendEmail({
                    from: EMAIL_SENDER_CLAIRE,
                    to: studentProfile.email,
                    subject: tpl.subject,
                    html: tpl.html,
                })
            }
            if (newMentorProfile?.email) {
                const tpl = mentorMatched(newMentorProfile.full_name || '', studentName)
                await sendEmail({
                    from: EMAIL_SENDER_CLAIRE,
                    to: newMentorProfile.email,
                    subject: tpl.subject,
                    html: tpl.html,
                })
            }
        } catch (emailError) {
            console.error('Match email error:', emailError)
        }

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('Assign mentor error:', error)
        return NextResponse.json(
            { error: error?.message || 'Failed to assign mentor' },
            { status: 500 }
        )
    }
}
