'use server'

import { revalidatePath } from 'next/cache'
import { EMAIL_SENDER_TEAM, sendEmail } from '@/lib/email/client'
import { parentWelcome } from '@/lib/email/templates'
import { createAdminClient } from '@/utils/supabase/admin'
import { createClient } from '@/utils/supabase/server'

const PARENT_ROLE = 'parent' as const
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const PATH = '/dashboard/admin/parents'

type ActionResult = { error: string } | { success: true; warning?: string }
type CreateParentResult = { error: string } | { success: true; emailSent: boolean; warning?: string }

async function requireStaff(): Promise<
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

function isStrongPassword(password: string): boolean {
    return (
        password.length >= 12 &&
        password.length <= 128 &&
        /[A-Z]/.test(password) &&
        /[a-z]/.test(password) &&
        /[0-9]/.test(password) &&
        !/\s/.test(password)
    )
}

function parseChildName(value: FormDataEntryValue | null): { error: string } | { name: string | null } {
    const name = String(value ?? '').trim()
    if (!name) return { name: null }
    if (name.length > 60) return { error: "Child's first name must be 60 characters or fewer" }
    return { name }
}

/**
 * Link a parent to a student with the service role. The table's trigger
 * refuses wrong roles and its unique indexes refuse a second active link on
 * either side, so this only translates those into readable messages.
 */
async function insertLink(
    admin: ReturnType<typeof createAdminClient>,
    parentId: string,
    studentId: string,
    createdBy: string
): Promise<string | null> {
    const { error } = await admin
        .from('parent_student_links')
        .insert({ parent_id: parentId, student_id: studentId, created_by: createdBy })
    if (!error) return null
    if (error.code === '23505') {
        return error.message.includes('per_student')
            ? 'That student is already linked to another parent. Unlink them first.'
            : 'This parent is already linked to a student. Unlink them first.'
    }
    console.error('parents: link insert failed', error.message)
    return error.message.includes('must be a')
        ? 'Only a parent account can be linked, and only to a student account.'
        : 'Could not link the accounts'
}

/**
 * Create a parent account. Works before the student exists: the child's
 * first name is optional, and so is linking straight away.
 *
 * createUser makes a student profile (the sign-up trigger only ever creates
 * students or mentors), so the role is set to parent here with the service
 * role and checked; if any of that fails the account is removed again.
 */
export async function createParentAccount(formData: FormData): Promise<CreateParentResult> {
    const staff = await requireStaff()
    if ('error' in staff) return staff
    const admin = staff.admin

    const fullName = String(formData.get('full_name') || '').trim()
    const email = String(formData.get('email') || '').trim().toLowerCase()
    const password = String(formData.get('password') || '')
    if (!fullName || fullName.length < 2 || fullName.length > 100) {
        return { error: 'Full name must be between 2 and 100 characters' }
    }
    if (!email || !EMAIL_RE.test(email)) {
        return { error: 'A valid email is required' }
    }
    if (!isStrongPassword(password)) {
        return { error: 'Password must be at least 12 characters with uppercase, lowercase, and a number' }
    }
    const child = parseChildName(formData.get('child_first_name'))
    if ('error' in child) return child
    const studentId = String(formData.get('student_id') || '').trim()
    if (studentId && !UUID_RE.test(studentId)) {
        return { error: 'Choose a student from the list' }
    }

    const { data: created, error: createError } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName },
    })

    if (createError || !created.user) {
        const message = (createError?.message || '').toLowerCase()
        if (message.includes('already') || message.includes('registered') || message.includes('exists')) {
            return { error: 'An account with this email already exists' }
        }
        console.error('createParentAccount createUser failed:', createError?.message)
        return { error: 'Failed to create the parent account' }
    }

    const userId = created.user.id
    const discard = async (reason: string, detail?: unknown) => {
        console.error(`createParentAccount refused: ${reason}`, { userId, detail })
        await admin.auth.admin.deleteUser(userId)
        return { error: 'Failed to create the parent account' }
    }

    const { data: profile, error: roleError } = await admin
        .from('profiles')
        .update({ role: PARENT_ROLE })
        .eq('id', userId)
        .select('role')
        .single()
    if (roleError || profile?.role !== PARENT_ROLE) {
        return discard('role update failed', roleError?.message ?? profile?.role)
    }

    const { error: detailsError } = await admin
        .from('parent_profiles')
        .insert({ id: userId, child_first_name: child.name, created_by: staff.userId })
    if (detailsError) {
        return discard('parent_profiles insert failed', detailsError.message)
    }

    // Linking is optional and must not undo a good account: a clash (student
    // already linked) becomes a warning the admin can fix from the list.
    let warning: string | undefined
    let childFirstName = child.name
    if (studentId) {
        const linkError = await insertLink(admin, userId, studentId, staff.userId)
        if (linkError) {
            warning = `Account created, but not linked: ${linkError}`
        } else if (!childFirstName) {
            const { data: student } = await admin.from('profiles').select('full_name').eq('id', studentId).single()
            childFirstName = student?.full_name?.trim().split(/\s+/)[0] || null
        }
    }

    const template = parentWelcome({ fullName, email, password, childFirstName })
    const sendResult = await sendEmail({
        from: EMAIL_SENDER_TEAM,
        to: email,
        subject: template.subject,
        html: template.html,
    })
    if (!sendResult.ok) {
        console.error('createParentAccount welcome email failed:', sendResult.error)
    }

    revalidatePath(PATH)
    return { success: true, emailSent: sendResult.ok, warning }
}

export async function linkParent(parentId: string, studentId: string): Promise<ActionResult> {
    const staff = await requireStaff()
    if ('error' in staff) return staff
    if (!UUID_RE.test(parentId) || !UUID_RE.test(studentId)) {
        return { error: 'Choose a parent and a student' }
    }

    const linkError = await insertLink(staff.admin, parentId, studentId, staff.userId)
    if (linkError) return { error: linkError }

    revalidatePath(PATH)
    return { success: true }
}

/** Revoke, never delete: the link row stays as history with revoked_at set. */
export async function unlinkParent(parentId: string): Promise<ActionResult> {
    const staff = await requireStaff()
    if ('error' in staff) return staff
    if (!UUID_RE.test(parentId)) {
        return { error: 'Unknown parent' }
    }

    const { data, error } = await staff.admin
        .from('parent_student_links')
        .update({ revoked_at: new Date().toISOString() })
        .eq('parent_id', parentId)
        .is('revoked_at', null)
        .select('id')
    if (error) {
        console.error('unlinkParent failed', error.message)
        return { error: 'Could not unlink' }
    }
    if (!data?.length) {
        return { error: 'This parent is not linked to a student' }
    }

    revalidatePath(PATH)
    return { success: true }
}

export async function updateChildName(parentId: string, childFirstName: string): Promise<ActionResult> {
    const staff = await requireStaff()
    if ('error' in staff) return staff
    if (!UUID_RE.test(parentId)) {
        return { error: 'Unknown parent' }
    }
    const child = parseChildName(childFirstName)
    if ('error' in child) return child

    const { data: target } = await staff.admin.from('profiles').select('role').eq('id', parentId).single()
    if (target?.role !== PARENT_ROLE) {
        return { error: 'Unknown parent' }
    }

    const { error } = await staff.admin
        .from('parent_profiles')
        .upsert({ id: parentId, child_first_name: child.name, updated_at: new Date().toISOString() })
    if (error) {
        console.error('updateChildName failed', error.message)
        return { error: "Could not save the child's name" }
    }

    revalidatePath(PATH)
    return { success: true }
}
