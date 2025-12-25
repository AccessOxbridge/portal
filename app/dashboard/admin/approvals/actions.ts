'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { sendMentorApprovalEmail } from '@/utils/email'
import OpenAI from 'openai'

export async function handleApplication(applicationId: string, status: 'approved' | 'dismissed', userId: string) {
    const supabase = await createClient()

    const {
        data: { user: adminUser },
    } = await supabase.auth.getUser()

    if (!adminUser) throw new Error('Unauthorized')

    // Check if admin
    const { data: adminProfile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', adminUser.id)
        .single()

    if (!adminProfile || (adminProfile.role !== 'admin' && adminProfile.role !== 'admin-dev')) throw new Error('Forbidden')

    // Start transaction-like flow (Supabase doesn't have multi-table transactions in client easily, so we do it step by step)
    const { error: updateError } = await supabase
        .from('mentor_applications')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', applicationId)

    if (updateError) throw updateError

    if (status === 'approved') {
        // Fetch application responses to populate mentor profile
        const { data: app } = await supabase
            .from('mentor_applications')
            .select('responses, cv_url, photo_url')
            .eq('id', applicationId)
            .single()

        if (!app) throw new Error('Application not found')

        // Generate real embedding using OpenAI
        const openai = new OpenAI({
            apiKey: process.env.OPEN_AI_API_KEYS,
        })

        const profileText = `
            Mentor Profile:
            Bio: ${app.responses.bio}
            Expertise: ${Array.isArray(app.responses.expertise) ? app.responses.expertise.join(', ') : app.responses.expertise}
            Experience: ${app.responses.years_experience}
            LinkedIn: ${app.responses.linkedin_url || 'N/A'}
        `.trim()

        let embedding: number[] = []
        try {
            const response = await openai.embeddings.create({
                model: 'text-embedding-3-small',
                input: profileText,
            })
            embedding = response.data[0].embedding
        } catch (error) {
            console.error('Error generating OpenAI embedding:', error)
            // We could either fail the whole thing or proceed without embedding
            // For now, let's throw to ensure the mentor doesn't end up in an inconsistent state
            throw new Error('Failed to generate profile embedding. Please try again.')
        }

        // Insert into mentors table
        const { error: mentorError } = await supabase.from('mentors').insert({
            id: userId,
            bio: app.responses.bio,
            expertise: Array.isArray(app.responses.expertise) ? app.responses.expertise : [app.responses.expertise],
            embedding: embedding,
            cv_url: app.cv_url,
            photo_url: app.photo_url,
        })

        if (mentorError) {
            console.error('Error creating mentor profile:', mentorError)
            // Rollback status? (Advanced: use a DB function/RPC for this)
        } else {
            // Fetch user email for notification
            const { data: userData } = await supabase.auth.admin.getUserById(userId)
            if (userData.user?.email) {
                await sendMentorApprovalEmail(userData.user.email, userData.user.user_metadata?.full_name || 'Mentor')
            }
        }
    }

    revalidatePath('/dashboard/admin/approvals')
}
