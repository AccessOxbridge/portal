import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import AdminOverview from './admin-overview'
import { loadAdminOverview } from './overview-data'

export default async function AdminDashboard() {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        return redirect('/login')
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

    if (!profile || (profile.role !== 'admin' && profile.role !== 'admin-dev')) {
        return redirect('/dashboard')
    }

    // Role checked above; the overview reads with the admin client, as
    // manage-sessions and session-payouts do.
    return <AdminOverview data={await loadAdminOverview()} firstName={profile.full_name?.split(' ')[0] || 'Admin'} />
}
