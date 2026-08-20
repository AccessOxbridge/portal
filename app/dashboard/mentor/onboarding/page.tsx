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

    const { data: profile } = await supabase
        .from('profiles')
        .select('role, full_name')
        .eq('id', user.id)
        .single()

    if (!profile || (profile.role !== 'mentor' && profile.role !== 'admin-dev')) {
        return redirect('/dashboard')
    }

    const { data: mentor } = await supabase
        .from('mentors')
        .select('status')
        .eq('id', user.id)
        .single()

    if (mentor && mentor.status !== 'details_required') {
        return redirect('/dashboard/mentor')
    }

    const firstName = profile.full_name?.trim().split(/\s+/)[0]

    return <OnboardingForm firstName={firstName} />
}
