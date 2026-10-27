import { redirect } from 'next/navigation'
import { AccountsClient } from '@/app/dashboard/admin/disable-account/accounts-client'
import { createAdminClient } from '@/utils/supabase/admin'
import { createClient } from '@/utils/supabase/server'

export default async function SalesDisableAccountPage() {
    const db = await createClient()
    const {
        data: { user },
    } = await db.auth.getUser()
    if (!user) redirect('/login')

    const { data: profile } = await db
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()
    if (profile?.role !== 'sales') redirect('/dashboard')

    // Sales cannot read parent profiles directly. The service client is used
    // only after the role check and returns the four fields this page needs.
    const admin = createAdminClient()
    const { data: parents, error: parentsError } = await admin
        .from('profiles')
        .select('id, full_name, email, role')
        .eq('role', 'parent')
        .order('full_name')
    if (parentsError) {
        throw new Error('Parent accounts could not be loaded. Please try again.')
    }

    const parentIds = (parents || []).map((parent) => parent.id)
    const { data: access, error: accessError } = parentIds.length
        ? await admin
              .from('account_access')
              .select('user_id, disabled_at')
              .in('user_id', parentIds)
              .not('disabled_at', 'is', null)
        : { data: [], error: null }
    if (accessError) throw new Error('Parent accounts could not be loaded. Please try again.')

    const disabledAt = new Map((access || []).map((row) => [row.user_id, row.disabled_at]))
    const accounts = (parents || []).map((parent) => ({
        id: parent.id,
        full_name: parent.full_name,
        email: parent.email,
        role: parent.role,
        disabledAt: disabledAt.get(parent.id) ?? null,
    }))

    return (
        <AccountsClient
            currentUserId={user.id}
            accounts={accounts}
            roleOptions={[['parent', 'Parents']]}
            footerNote="Parent records remain available when portal access is disabled. Accounts can be re-enabled at any time."
        />
    )
}
