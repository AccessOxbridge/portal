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

        const body = await req.json()
        const {
            schoolName,
            schoolCountry,
            curriculum,
            curriculumOther,
            subjects,
            targetUniversities,
            timezone,
            academicInterests,
            extracurriculars,
            anythingElse,
            parentEmail,
            timeSlots: timeSlotsFromBody,
        } = body

        const timeSlots = timeSlotsFromBody || body?.availability || []

        if (!Array.isArray(timeSlots) || timeSlots.length === 0) {
            return NextResponse.json(
                { error: 'Please provide at least one available time slot.' },
                { status: 400 }
            )
        }

        // Find the student's current assigned mentor.
        const { data: assignment } = await supabase
            .from('student_mentor_assignments')
            .select('mentor_id')
            .eq('student_id', user.id)
            .eq('is_current', true)
            .maybeSingle()

        if (!assignment?.mentor_id) {
            return NextResponse.json(
                { error: 'You do not have a mentor assigned yet. Your mentor will be assigned by the Access Oxbridge team.' },
                { status: 400 }
            )
        }

        const mentorId = assignment.mentor_id

        // Avoid stacking duplicate pending requests with the same mentor.
        const { data: existingPending } = await supabase
            .from('mentorship_requests')
            .select('id')
            .eq('student_id', user.id)
            .eq('mentor_id', mentorId)
            .eq('status', 'pending')
            .maybeSingle()

        if (existingPending) {
            return NextResponse.json(
                { error: 'You already have a pending request with your mentor. Please wait for them to respond.' },
                { status: 400 }
            )
        }

        // Create a single mentorship request targeting the assigned mentor.
        const { error: insertError } = await supabase
            .from('mentorship_requests')
            .insert({
                student_id: user.id,
                mentor_id: mentorId,
                responses: {
                    schoolName,
                    schoolCountry,
                    curriculum,
                    curriculumOther,
                    subjects,
                    targetUniversities,
                    timezone,
                    timeSlots,
                    academicInterests,
                    extracurriculars,
                    anythingElse,
                },
                status: 'pending',
            })

        if (insertError) throw insertError

        // Keep student_profiles in sync for fortnightly reports.
        const targetUniversity = Array.isArray(targetUniversities) && targetUniversities.length > 0 ? targetUniversities[0] : null
        await supabase
            .from('student_profiles')
            .upsert({
                id: user.id,
                school_name: schoolName || null,
                school_country: schoolCountry || null,
                curriculum: curriculum || null,
                curriculum_other: curriculumOther || null,
                target_university: targetUniversity,
                subjects: Array.isArray(subjects) ? subjects : [],
                interests: academicInterests || null,
                extracurriculars: extracurriculars || null,
                additional_notes: anythingElse || null,
                timezone: timezone || null,
                parent_email: parentEmail && String(parentEmail).trim() ? String(parentEmail).trim() : null,
                updated_at: new Date().toISOString(),
            }, { onConflict: 'id' })

        // Notify the assigned mentor.
        const { data: mentorProfile } = await supabase
            .from('profiles')
            .select('id, email, full_name')
            .eq('id', mentorId)
            .single()

        if (mentorProfile?.email) {
            await supabase.from('notifications').insert({
                recipient_id: mentorProfile.id,
                recipient_email: mentorProfile.email,
                type: 'mentorship_request' as const,
                title: 'New Session Request',
                message: `${user.user_metadata?.full_name || 'Your assigned student'} has requested a session. Please review their proposed times and confirm a slot.`,
                data: {
                    student_id: user.id,
                    student_name: user.user_metadata?.full_name || 'Student',
                },
            })
        }

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('Book session error:', error)
        return NextResponse.json(
            { error: error.message || 'Internal Server Error' },
            { status: 500 }
        )
    }
}
