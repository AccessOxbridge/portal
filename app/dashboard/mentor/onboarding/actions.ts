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
    let cvUrl = ''
    let photoUrl = ''

    for (const [key, value] of formData.entries()) {
        if (key.startsWith('$ACTION')) continue

        if (value instanceof File) {
            if (value.size === 0) continue

            const fileExt = value.name.split('.').pop()
            const fileName = `${user.id}/${key}-${Math.random()}.${fileExt}`
            const filePath = `${fileName}`

            const { error: uploadError } = await supabase.storage.from('mentor-assets').upload(filePath, value)

            if (uploadError) {
                console.error(`Error uploading ${key}:`, uploadError)
                continue
            }

            const {
                data: { publicUrl },
            } = supabase.storage.from('mentor-assets').getPublicUrl(filePath)

            if (key === 'cv') cvUrl = publicUrl
            if (key === 'photo') photoUrl = publicUrl
            responses[key] = publicUrl
        } else {
            // Handle multiselect
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
        }
    }

    const updatedResponses = {
        ...responses,
        cv_url: cvUrl,
        photo_url: photoUrl,
    }

    // const { error } = await supabase.from('mentors').upsert({
    //     id: user.id,
    //     responses: updatedResponses,
    //     status: 'pending_approval',
    //     bio: responses.bio || '',
    //     expertise: Array.isArray(responses.expertise) ? responses.expertise : (responses.expertise ? [responses.expertise] : []),
    //     cv_url: cvUrl,
    //     photo_url: photoUrl,
    // })
    // Note: we intentionally UPDATE (not UPSERT). RLS policies allow mentors to update their own row,
    // but do not allow INSERT, and Postgres checks INSERT policies even for UPSERT-on-conflict updates.
    const { data: updatedMentors, error } = await supabase
        .from('mentors')
        .update({
            responses: updatedResponses,
            status: 'pending_approval',
            bio: responses.bio || '',
            expertise: Array.isArray(responses.expertise) ? responses.expertise : (responses.expertise ? [responses.expertise] : []),
            cv_url: cvUrl,
            photo_url: photoUrl,
        })
        .eq('id', user.id)
        .select('id')

    if (error) {
        console.error('Error submitting application:', error)
        throw new Error('Failed to submit application. Please try again.')
    }

    if (!updatedMentors || updatedMentors.length === 0) {
        console.error('Mentor row not found for user during onboarding:', { userId: user.id })
        throw new Error('Your mentor profile is not initialized yet. Please sign out and sign back in, then try again.')
    }

    // Mock email
    await sendMentorApplicationReceivedEmail(user.email || '', user.user_metadata?.full_name || 'Mentor')

    revalidatePath('/dashboard/mentor')
    redirect('/dashboard/mentor')
}
