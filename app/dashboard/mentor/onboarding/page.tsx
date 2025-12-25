import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import OnboardingForm from './OnboardingForm'

export default async function OnboardingPage() {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        return redirect('/login')
    }

    // Check if already applied
    const { data: application } = await supabase
        .from('mentor_applications')
        .select('status')
        .eq('user_id', user.id)
        .single()

    if (application) {
        return redirect('/dashboard/mentor')
    }

    return <OnboardingForm />
}
