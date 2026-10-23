import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

/**
 * Every /dashboard/admin page is for admins only. Several admin pages are
 * client components with no server check of their own (clients, mentors,
 * payouts, students); the data they load is still limited by RLS and their
 * actions check the role, but a student, mentor or parent should not get the
 * admin screens at all.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (me?.role !== 'admin' && me?.role !== 'admin-dev') redirect('/dashboard')

    return children
}
