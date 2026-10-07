'use server'

import { revalidatePath } from 'next/cache'
import { validateTargetInput, type TargetInput } from '@/lib/session-frequency'
import { createAdminClient } from '@/utils/supabase/admin'
import { createClient } from '@/utils/supabase/server'

type ActionResult = { error: string } | { success: true }

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

async function requireAdmin(): Promise<
    { error: string } | { ok: true; admin: ReturnType<typeof createAdminClient>; userId: string }
> {
    const authClient = await createClient()
    const {
        data: { user },
    } = await authClient.auth.getUser()
    if (!user) {
        return { error: 'Not authenticated' }
    }

    const { data: callerProfile } = await authClient
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (!callerProfile || (callerProfile.role !== 'admin' && callerProfile.role !== 'admin-dev')) {
        return { error: 'Not authorized' }
    }

    return { ok: true, admin: createAdminClient(), userId: user.id }
}

/**
 * Set or replace a student's session target. One row per student, so this is
 * an upsert on student_id. Writes exactly one row in student_session_targets
 * and nothing else.
 */
export async function saveStudentTarget(studentId: string, input: TargetInput): Promise<ActionResult> {
    const staff = await requireAdmin()
    if ('error' in staff) return staff

    if (!UUID_RE.test(studentId)) {
        return { error: 'Unknown student' }
    }

    const parsed = validateTargetInput(input)
    if ('error' in parsed) return parsed

    const { admin } = staff
    const { data: student } = await admin.from('profiles').select('id, role').eq('id', studentId).maybeSingle()
    if (!student || student.role !== 'student') {
        return { error: 'Targets can only be set for students' }
    }

    const { error } = await admin.from('student_session_targets').upsert(
        {
            student_id: studentId,
            plan_type: parsed.target.planType,
            sessions: parsed.target.sessions,
            weeks: parsed.target.weeks,
            start_date: parsed.target.startDate,
            note: parsed.note,
            set_by: staff.userId,
            updated_at: new Date().toISOString(),
        },
        { onConflict: 'student_id' }
    )

    if (error) {
        console.error('saveStudentTarget failed:', error.message)
        return { error: 'Could not save the target' }
    }

    revalidatePath('/dashboard/admin/performance')
    return { success: true }
}

/** Remove a student's target; they go back to "No target". Deletes one row. */
export async function removeStudentTarget(studentId: string): Promise<ActionResult> {
    const staff = await requireAdmin()
    if ('error' in staff) return staff

    if (!UUID_RE.test(studentId)) {
        return { error: 'Unknown student' }
    }

    const { error } = await staff.admin.from('student_session_targets').delete().eq('student_id', studentId)

    if (error) {
        console.error('removeStudentTarget failed:', error.message)
        return { error: 'Could not remove the target' }
    }

    revalidatePath('/dashboard/admin/performance')
    return { success: true }
}
