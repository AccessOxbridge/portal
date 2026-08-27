import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { CreateAccountClient } from './create-account-client'

export default async function AdminCreateAccountPage() {
    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()
    if (!user) return redirect('/login')

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (!profile || (profile.role !== 'admin' && profile.role !== 'admin-dev')) {
        return redirect('/dashboard')
    }

    return <CreateAccountClient />
}
