import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

/** Every sales page is restricted to the sales role. */
export default async function SalesLayout({ children }: { children: React.ReactNode }) {
    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()
    if (profile?.role !== 'sales') redirect('/dashboard')

    return children
}
