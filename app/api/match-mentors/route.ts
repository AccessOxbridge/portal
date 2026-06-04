import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

/**
 * Student onboarding / profile save.
 *
 * NOTE: Under the single-assigned-mentor model, students are matched to a mentor
 * manually by an admin (see /api/admin/students/assign-mentor). This endpoint no
 * longer performs AI matching or creates mentorship_requests — it simply persists
 * the student's academic profile. Booking a session is done separately via
 * /api/student/book-session once a mentor has been assigned.
 */
export async function POST(req: Request) {
    try {
        const supabase = await createClient()

        const { data: { user }, error: authError } = await supabase.auth.getUser()
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
        } = body

        const targetUniversity = Array.isArray(targetUniversities) && targetUniversities.length > 0
            ? targetUniversities[0]
            : null

        const { error: upsertError } = await supabase
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
                is_complete: true,
                updated_at: new Date().toISOString(),
            }, { onConflict: 'id' })

        if (upsertError) throw upsertError

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('Save profile error:', error)
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
    }
}
