import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import CreditPackagesManager from './credit-packages-manager'

export default async function AdminCreditsPage() {
    const supabase = await createClient()

    // Check if user is admin
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
        redirect('/login')
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (!profile || !['admin', 'admin-dev'].includes(profile.role)) {
        redirect('/dashboard')
    }

    // Fetch all packages
    const { data: packages } = await supabase
        .from('credit_packages')
        .select('*')
        .order('sort_order', { ascending: true })

    return (
        <div className="max-w-6xl mx-auto">
            <header className="mb-10">
                <h1 className="text-4xl font-extrabold text-accent tracking-tight">
                    Manage Credit Packages
                </h1>
                <p className="mt-3 text-gray-500 text-lg">
                    Create, edit, and manage credit packages that students can purchase
                </p>
            </header>

            <CreditPackagesManager initialPackages={packages || []} />
        </div>
    )
}
