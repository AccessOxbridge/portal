import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import CreditPackages from '@/components/dashboard/credit-packages'

export default async function CreditsPage() {
    const supabase = await createClient()

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
        redirect('/login')
    }

    // Fetch user's current credits
    const { data: profile } = await supabase
        .from('profiles')
        .select('credits')
        .eq('id', user.id)
        .single()

    // Fetch active credit packages
    const { data: packages } = await supabase
        .from('credit_packages')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })

    return (
        <div className="max-w-5xl mx-auto">
            <header className="mb-10">
                <h1 className="text-4xl font-extrabold text-accent tracking-tight">
                    Credits & Payments
                </h1>
                <p className="mt-3 text-gray-500 text-lg">
                    Purchase credits to book mentorship sessions with our expert tutors
                </p>
            </header>

            <CreditPackages
                packages={packages || []}
                currentCredits={profile?.credits || 0}
            />
        </div>
    )
}
