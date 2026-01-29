import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import TrainingContent from './training-content'

export default async function MentorTrainingPage() {
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

    // Fetch mentor details - using only existing columns for now
    // New columns will be added via database migration
    const { data: mentor } = await supabase
        .from('mentors')
        .select(`
            id,
            status,
            photo_url,
            bio,
            expertise,
            phone,
            stripe_account_id,
            payouts_enabled
        `)
        .eq('id', user.id)
        .single()

    if (!mentor) {
        return redirect('/dashboard/mentor/onboarding')
    }

    // For now, we'll use placeholder values for new tracking columns
    // These will work once the database migration is applied
    const mentorData = mentor as any

    // Calculate onboarding completion status for each step
    // Using existing fields where possible, placeholder for new ones
    const onboardingStatus = {
        training: !!mentorData.training_completed_at,
        quiz: !!mentorData.quiz_completed_at,
        contract: !!mentorData.contract_signed_at,
        dbs: !!mentorData.dbs_certificate_url,
        payment: !!mentorData.payouts_enabled,
        profile: !!mentorData.profile_completed_at || (!!mentorData.bio && !!mentorData.photo_url)
    }

    return (
        <div className="max-w-4xl mx-auto">
            <TrainingContent
                mentorId={user.id}
                mentorName={profile.full_name || 'Mentor'}
                onboardingStatus={onboardingStatus}
                existingData={{
                    photo_url: mentorData.photo_url,
                    bio: mentorData.bio,
                    expertise: mentorData.expertise,
                    university: mentorData.university || null,
                    phone: mentorData.phone,
                    stripeConnected: !!mentorData.stripe_account_id,
                    payoutsEnabled: !!mentorData.payouts_enabled,
                    contractSignature: mentorData.contract_signature || null,
                    dbsCertificateUrl: mentorData.dbs_certificate_url || null
                }}
            />
        </div>
    )
}
