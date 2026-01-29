'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function completeTraining() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return { error: 'Not authenticated' }
    }

    // Using raw update to handle new columns that may not be in the TypeScript types yet
    const { error } = await supabase
        .from('mentors')
        .update({ training_completed_at: new Date().toISOString() } as any)
        .eq('id', user.id)

    if (error) {
        return { error: error.message }
    }

    revalidatePath('/dashboard/mentor/training')
    return { success: true }
}

export async function completeQuiz(answers: Record<string, string>) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return { error: 'Not authenticated' }
    }

    // TODO: Validate answers against correct answers when quiz content is provided
    // For now, just mark as complete
    const { error } = await supabase
        .from('mentors')
        .update({
            quiz_completed_at: new Date().toISOString(),
            quiz_answers: answers // Store answers for admin review if needed
        } as any)
        .eq('id', user.id)

    if (error) {
        return { error: error.message }
    }

    revalidatePath('/dashboard/mentor/training')
    return { success: true }
}

export async function signContract(signature: string) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return { error: 'Not authenticated' }
    }

    if (!signature || signature.trim().length < 2) {
        return { error: 'Please enter your full name as signature' }
    }

    const { error } = await supabase
        .from('mentors')
        .update({
            contract_signed_at: new Date().toISOString(),
            contract_signature: signature.trim()
        } as any)
        .eq('id', user.id)

    if (error) {
        return { error: error.message }
    }

    revalidatePath('/dashboard/mentor/training')
    return { success: true }
}

export async function uploadDBS(formData: FormData) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return { error: 'Not authenticated' }
    }

    const file = formData.get('dbs_certificate') as File
    if (!file || file.size === 0) {
        return { error: 'Please select a file' }
    }

    // Check file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
        return { error: 'File size must be less than 10MB' }
    }

    // Upload to Supabase storage
    const fileExt = file.name.split('.').pop()
    const fileName = `${user.id}/dbs_certificate.${fileExt}`

    const { error: uploadError } = await supabase.storage
        .from('mentor-assets')
        .upload(fileName, file, { upsert: true })

    if (uploadError) {
        return { error: uploadError.message }
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
        .from('mentor-assets')
        .getPublicUrl(fileName)

    // Update mentor record
    const { error } = await supabase
        .from('mentors')
        .update({ dbs_certificate_url: publicUrl } as any)
        .eq('id', user.id)

    if (error) {
        return { error: error.message }
    }

    revalidatePath('/dashboard/mentor/training')
    return { success: true, url: publicUrl }
}

export async function completeProfile(formData: FormData) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return { error: 'Not authenticated' }
    }

    const bio = formData.get('bio') as string
    const university = formData.get('university') as string
    const phone = formData.get('phone') as string
    const photo = formData.get('photo') as File | null

    let photoUrl: string | null = null

    // Upload photo if provided
    if (photo && photo.size > 0) {
        if (photo.size > 5 * 1024 * 1024) {
            return { error: 'Photo must be less than 5MB' }
        }

        const fileExt = photo.name.split('.').pop()
        const fileName = `${user.id}/profile_photo.${fileExt}`

        const { error: uploadError } = await supabase.storage
            .from('mentor-assets')
            .upload(fileName, photo, { upsert: true })

        if (uploadError) {
            return { error: uploadError.message }
        }

        const { data: { publicUrl } } = supabase.storage
            .from('mentor-assets')
            .getPublicUrl(fileName)

        photoUrl = publicUrl
    }

    const updateData: Record<string, any> = {
        profile_completed_at: new Date().toISOString()
    }

    if (bio) updateData.bio = bio
    if (university) updateData.university = university
    if (phone) updateData.phone = phone
    if (photoUrl) updateData.photo_url = photoUrl

    const { error } = await supabase
        .from('mentors')
        .update(updateData)
        .eq('id', user.id)

    if (error) {
        return { error: error.message }
    }

    revalidatePath('/dashboard/mentor/training')
    return { success: true }
}
