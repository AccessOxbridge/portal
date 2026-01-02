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
    const { data: mentor } = await supabase
        .from('mentors')
        .select('status')
        .eq('id', user.id)
        .single()

    if (mentor && mentor.status !== 'details_required') {
        return redirect('/dashboard/mentor')
    }

    return <OnboardingForm />
}
