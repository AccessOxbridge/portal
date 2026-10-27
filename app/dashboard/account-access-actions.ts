'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'

export async function setAccountEnabled(
    userId: string,
    enabled: boolean,
): Promise<{ error?: string }> {
    const db = await createClient()
    const {
        data: { user },
    } = await db.auth.getUser()
    if (!user) return { error: 'Please sign in again.' }
    if (
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
            userId,
        ) ||
        typeof enabled !== 'boolean'
    ) {
        return { error: 'Choose a valid account and access state.' }
    }
    // The transaction checks the caller, target, financial blockers and audit.
    const { error } = await db.rpc('admin_set_account_enabled', {
        p_user_id: userId,
        p_enabled: enabled,
    })
    if (error) return { error: error.message }
    revalidatePath('/dashboard', 'layout')
    return {}
}
