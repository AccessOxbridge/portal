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

    // Fetch user's current credits and profile details
    const { data: profile } = await supabase
        .from('profiles')
        .select(`
            credits,
            student_profiles (
                target_university,
                target_course
            )
        `)
        .eq('id', user.id)
        .single()

    // Fetch active credit packages
    const { data: packages } = await supabase
        .from('credit_packages')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })

    const profileData: any = profile
    const studentProfile = Array.isArray(profileData?.student_profiles)
        ? profileData?.student_profiles[0]
        : profileData?.student_profiles

    return (
        <div className="max-w-6xl mx-auto">
            <header className="mb-6">
                <h1 className="text-3xl font-semibold tracking-tight text-foreground text-balance sm:text-4xl">
                    Expert guidance, for you
                </h1>
            </header>

            <CreditPackages
                packages={packages || []}
                currentCredits={profile?.credits || 0}
                targetUniversity={studentProfile?.target_university}
                targetCourse={studentProfile?.target_course}
            />
        </div>
    )
}
