'use server'

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { sendMentorApplicationReceivedEmail } from '@/utils/email'

export async function submitOnboarding(formData: FormData) {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        throw new Error('Unauthorized')
    }

    const responses: Record<string, any> = {}
    formData.forEach((value, key) => {
        if (key.startsWith('$ACTION')) return

        // Handle multiselect (if multiple values for same key)
        const existing = responses[key]
        if (existing) {
            if (Array.isArray(existing)) {
                responses[key] = [...existing, value]
            } else {
                responses[key] = [existing, value]
            }
        } else {
            responses[key] = value
        }
    })

    const { error } = await supabase.from('mentor_applications').insert({
        user_id: user.id,
        responses,
        status: 'pending',
    })

    if (error) {
        console.error('Error submitting application:', error)
        throw new Error('Failed to submit application. Please try again.')
    }

    // Mock email
    await sendMentorApplicationReceivedEmail(user.email || '', user.user_metadata?.full_name || 'Mentor')

    revalidatePath('/dashboard/mentor')
    redirect('/dashboard/mentor')
}
