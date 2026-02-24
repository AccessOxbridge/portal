import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import TrainingContent from './training-content'
import { isAccountPayoutsEnabled } from '@/utils/stripe'

type MentorTrainingPageProps = {
    searchParams?: {
        step?: string
    }
}

const STEP_INDEX: Record<string, number> = {
    welcome: 0,
    training: 1,
    quiz: 2,
    contract: 3,
    dbs: 4,
    payment: 5,
    profile: 6
}

export default async function MentorTrainingPage({ searchParams }: MentorTrainingPageProps) {
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
            payouts_enabled,
            training_completed_at,
            quiz_completed_at,
            contract_signed_at,
            contract_signature,
            dbs_certificate_url,
            background_check_confirmed_at,
            profile_completed_at,
            university
        `)
        .eq('id', user.id)
        .single()

    // No mentor row yet: show message and link to application instead of redirecting to onboarding
    if (!mentor) {
        return (
            <div className="max-w-2xl mx-auto text-center py-16 px-6">
                <h1 className="text-2xl font-bold text-gray-900 mb-4">Training & Onboarding</h1>
                <p className="text-gray-600 mb-8">
                    Please complete your mentor application first. Once your application is set up, you can access training and onboarding here.
                </p>
                <Link
                    href="/dashboard/mentor/onboarding"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-accent text-white font-bold rounded-xl hover:opacity-90 transition-all"
                >
                    Go to mentor application
                </Link>
            </div>
        )
    }

    // For now, we'll use placeholder values for new tracking columns
    // These will work once the database migration is applied
    let mentorData = mentor as any

    // Stripe webhooks can arrive slightly after the user returns from onboarding.
    // We sync from Stripe here so payment status updates immediately in the UI.
    if (mentorData.stripe_account_id && !mentorData.payouts_enabled) {
        try {
            const payoutsEnabled = await isAccountPayoutsEnabled(mentorData.stripe_account_id)
            if (payoutsEnabled) {
                await supabase
                    .from('mentors')
                    .update({ payouts_enabled: true })
                    .eq('id', user.id)

                mentorData = {
                    ...mentorData,
                    payouts_enabled: true
                }
            }
        } catch (error) {
            console.error('Failed to sync Stripe payouts status for mentor training page:', error)
        }
    }

    // Calculate onboarding completion status for each step
    // Using existing fields where possible, placeholder for new ones
    const onboardingStatus = {
        training: !!mentorData.training_completed_at,
        quiz: !!mentorData.quiz_completed_at,
        contract: !!mentorData.contract_signed_at,
        dbs: !!mentorData.dbs_certificate_url || !!mentorData.background_check_confirmed_at,
        payment: !!mentorData.payouts_enabled,
        // Only consider the profile step complete when an explicit timestamp exists.
        // Previously we treated presence of bio + photo as "completed", which
        // caused newly-onboarded users (who provide these during application)
        // to appear as having finished the profile onboarding step. Require the
        // dedicated `profile_completed_at` flag so completion only happens when
        // the user explicitly finishes the profile step in the training flow.
        profile: !!mentorData.profile_completed_at
    }
    const initialStep = STEP_INDEX[searchParams?.step ?? ''] ?? 0

    return (
        <div className="max-w-4xl mx-auto">
            <TrainingContent
                mentorId={user.id}
                mentorName={profile.full_name || 'Mentor'}
                onboardingStatus={onboardingStatus}
                initialStep={initialStep}
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
