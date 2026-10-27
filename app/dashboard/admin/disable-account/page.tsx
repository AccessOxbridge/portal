import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { AccountsClient } from './accounts-client'
import { disabledAccountIds } from '@/lib/account-access'
import type { Database } from '@/utils/supabase/types'

export default async function DisableAccountPage() {
    const db = await createClient()
    const {
        data: { user },
    } = await db.auth.getUser()
    if (!user) redirect('/login')
    const { data: caller } = await db
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()
    if (!caller || !['admin', 'admin-dev'].includes(caller.role))
        redirect('/dashboard')

    async function allProfiles() {
        const rows: Pick<
            Database['public']['Views']['profiles_private']['Row'],
            'id' | 'full_name' | 'email' | 'role'
        >[] = []
        for (let from = 0; ; from += 1000) {
            const { data, error } = await db
                .from('profiles_private')
                .select('id, full_name, email, role')
                .in('role', [
                    'student',
                    'mentor',
                    'parent',
                    'admin',
                    'admin-dev',
                ])
                .order('full_name')
                .order('id')
                .range(from, from + 999)
            if (error)
                throw new Error(
                    'Accounts could not be loaded. Please try again.',
                )
            rows.push(...data)
            if (data.length < 1000) return rows
        }
    }
    const [profiles, disabledIds] = await Promise.all([
        allProfiles(),
        disabledAccountIds(db),
    ])
    const disabled = new Map<string, string>()
    const ids = [...disabledIds].filter((id): id is string => !!id)
    for (let from = 0; from < ids.length; from += 200) {
        const { data, error } = await db
            .from('account_access')
            .select('user_id, disabled_at')
            .in('user_id', ids.slice(from, from + 200))
        if (error)
            throw new Error('Accounts could not be loaded. Please try again.')
        data.forEach((row) => {
            if (row.disabled_at) disabled.set(row.user_id, row.disabled_at)
        })
    }
    const accounts = (profiles || []).flatMap((profile) =>
        profile.id && profile.role
            ? [
                  {
                      id: profile.id,
                      role: profile.role,
                      full_name: profile.full_name,
                      email: profile.email,
                      disabledAt: disabled.get(profile.id) ?? null,
                  },
              ]
            : [],
    )
    return <AccountsClient currentUserId={user.id} accounts={accounts} />
}
