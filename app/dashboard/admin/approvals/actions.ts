'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { sendMentorApprovalEmail } from '@/utils/email'
import OpenAI from 'openai'

interface MentorResponses {
    bio: string
    expertise: string | string[]
    years_experience: string
    linkedin_url?: string
}

export async function handleApplication(userId: string, status: 'approved' | 'dismissed') {
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

    if (status === 'approved') {
        // Fetch mentor data to generate embedding
        const { data: mentor } = await supabase
            .from('mentors')
            .select('responses')
            .eq('id', userId)
            .single()

        if (!mentor) throw new Error('Mentor not found')

        const responses = mentor.responses as unknown as MentorResponses

        // Generate real embedding using OpenAI
        const apiKey = process.env.OPEN_AI_API_KEYS
        if (!apiKey) {
            throw new Error('OPEN_AI_API_KEYS is not configured')
        }

        const openai = new OpenAI({
            apiKey: apiKey,
        })

        const profileText = `
            Mentor Profile:
            Bio: ${responses.bio}
            Expertise: ${Array.isArray(responses.expertise) ? responses.expertise.join(', ') : responses.expertise}
            Experience: ${responses.years_experience}
            LinkedIn: ${responses.linkedin_url || 'N/A'}
        `.trim()

        let embeddingString: string | null = null
        try {
            const response = await openai.embeddings.create({
                model: 'text-embedding-3-small',
                input: profileText,
            })
            embeddingString = `[${response.data[0].embedding.join(',')}]`
        } catch (error) {
            console.error('Error generating OpenAI embedding:', error)
            throw new Error('Failed to generate profile embedding. Please try again.')
        }

        // Update to active
        const { error: mentorError } = await supabase.from('mentors').update({
            status: 'active',
            embedding: embeddingString,
            updated_at: new Date().toISOString()
        }).eq('id', userId)

        if (mentorError) {
            console.error('Error activating mentor profile:', mentorError)
            throw mentorError
        }

        // Fetch user email from profiles for notification
        const { data: userData } = await supabase
            .from('profiles')
            .select('email, full_name')
            .eq('id', userId)
            .single()

        if (userData?.email) {
            await sendMentorApprovalEmail(userData.email, userData.full_name || 'Mentor')
        }
    } else {
        // Dismissed -> back to details_required
        const { error: dismissError } = await supabase
            .from('mentors')
            .update({ status: 'details_required', updated_at: new Date().toISOString() })
            .eq('id', userId)

        if (dismissError) throw dismissError
    }

    revalidatePath('/dashboard/admin/approvals')
}
