import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/utils/supabase/types'

export const DISABLED_ACCOUNT_MESSAGE =
    'Your account has been disabled. Please contact the administrator.'

export async function isAccountDisabled(
    db: SupabaseClient<Database>,
    userId: string,
) {
    const { data, error } = await db
        .from('account_access')
        .select('disabled_at')
        .eq('user_id', userId)
        .maybeSingle()
    if (error)
        throw new Error(
            'Account access could not be checked. Please try again.',
        )
    return !!data?.disabled_at
}

/** Only use after authenticating the caller. RLS exposes other ids to admins. */
export async function disabledAccountIds(db: SupabaseClient<Database>) {
    const ids = new Set<string | null>()
    for (let from = 0; ; from += 1000) {
        const { data, error } = await db
            .from('account_access')
            .select('user_id')
            .not('disabled_at', 'is', null)
            .order('user_id')
            .range(from, from + 999)
        if (error)
            throw new Error(
                'Account access could not be checked. Please try again.',
            )
        data.forEach((row) => ids.add(row.user_id))
        if (data.length < 1000) return ids
    }
}
