'use server'

import { createAdminClient } from '@/utils/supabase/admin'
import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

const ADMIN_ROLES = ['admin', 'admin-dev']

export async function registerPremiumClient(formData: FormData) {
    // Authorize the CALLER first: this action uses the service-role key and can
    // create admin/client accounts, so it must be restricted to signed-in admins.
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
    if (!callerProfile || !ADMIN_ROLES.includes(callerProfile.role)) {
        return { error: 'Not authorized' }
    }

    const supabase = createAdminClient()

    const email = formData.get('email') as string
    const full_name = formData.get('full_name') as string
    const role = formData.get('role') as string

    if (!email || !full_name) {
        return { error: 'Email and Name are required' }
    }

    // Validate role - only allow 'client' or 'admin'
    const validRoles = ['client', 'admin']
    const selectedRole = validRoles.includes(role) ? role : 'client'

    // Generate a random password using crypto.randomUUID()
    const password = crypto.randomUUID().split('-')[0].toUpperCase() +
        crypto.randomUUID().split('-')[1] + '!'

    // Create user in Supabase Auth
    const { data: userData, error: authError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
            full_name,
            role: selectedRole
        }
    })

    if (authError) {
        console.error('Error creating user:', authError.message)
        return { error: authError.message }
    }

    const userId = userData.user.id

    // The sign-up trigger (handle_new_user) creates the profile, but it only
    // takes 'mentor' from user_metadata (which users control) and makes
    // everyone else a student. Set the real role here with the service role,
    // and remove the account if that fails so no half-made user is left.
    const { data: profile, error: roleError } = await supabase
        .from('profiles')
        .update({ role: selectedRole as 'admin' | 'client' })
        .eq('id', userId)
        .select('role')
        .single()

    if (roleError || profile?.role !== selectedRole) {
        console.error('registerPremiumClient role update failed:', roleError?.message ?? profile?.role)
        await supabase.auth.admin.deleteUser(userId)
        return { error: 'Failed to create the account' }
    }

    // Trigger welcome email by inserting into notifications table
    const roleLabel = selectedRole === 'admin' ? 'Admin' : 'Premium Client'
    const { error: notifyError } = await supabase
        .from('notifications')
        .insert({
            recipient_id: userId,
            recipient_email: email,
            title: `Welcome to the Oxbridge ${roleLabel} Portal`,
            message: `Hello ${full_name},\n\nWelcome to the Oxford-Bridge ${roleLabel} Portal. Your ${roleLabel.toLowerCase()} account has been successfully created.\n\nYou can log in using your email and the following auto-generated password:\n\nPassword: ${password}\n\nPlease log in at: https://portal.oxford-bridge.com/login\n\nWe recommend changing your password immediately after your first login for security purposes.\n\nBest regards,\nThe Oxford-Bridge Team`,
            type: 'system_alert'
        })

    if (notifyError) {
        console.error('Error sending notification:', notifyError.message)
        // We don't return error here because the user WAS created, but notification failed.
        // In a real app we might want to handle this better (e.g. retry or manual email).
    }

    revalidatePath('/dashboard/admin/clients')
    return { success: true }
}
