import { NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { requireParentApi } from '@/lib/parent-api'
import { parseStudentInfo } from '@/lib/parent-student-info'

/**
 * POST /api/parent/student-info
 * Saves what a parent tells us about their child (one row per parent; saving
 * again updates it). The caller must be a parent; the row is always theirs.
 */
export async function POST(req: Request) {
    try {
        const auth = await requireParentApi()
        if ('response' in auth) return auth.response

        const parsed = parseStudentInfo(await req.json().catch(() => null))
        if ('error' in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 })
        const i = parsed.info

        const admin = createAdminClient()
        const { error } = await admin.from('parent_student_info').upsert(
            {
                parent_id: auth.userId,
                child_first_name: i.childFirstName,
                child_last_name: i.childLastName || null,
                school: i.school || null,
                year_group: i.yearGroup || null,
                subjects: i.subjects || null,
                course_interest: i.courseInterest || null,
                university_preference: i.universityPreference || null,
                notes: i.notes || null,
                updated_at: new Date().toISOString(),
            },
            { onConflict: 'parent_id' }
        )
        if (error) {
            console.error('[parent/student-info] upsert failed:', error)
            return NextResponse.json({ error: 'Could not save the details' }, { status: 500 })
        }
        return NextResponse.json({ success: true })
    } catch (e) {
        console.error('[parent/student-info]', e)
        return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
    }
}
