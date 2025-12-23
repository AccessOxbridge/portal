import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export default async function DashboardPage() {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        return redirect('/login')
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (!profile) {
        return redirect('/error')
    }

    // Redirect to role-specific dashboard
    if (profile.role === 'admin-dev') {
        redirect('/dashboard/admin')
    }
    redirect(`/dashboard/${profile.role}`)
}
