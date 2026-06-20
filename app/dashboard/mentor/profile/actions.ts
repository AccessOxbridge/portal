'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateMentorProfile(prevState: any, formData: FormData) {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        return { error: 'Unauthorized' }
    }

    // Make sure the caller is actually a mentor (or admin-dev impersonating)
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (!profile || (profile.role !== 'mentor' && profile.role !== 'admin-dev')) {
        return { error: 'Unauthorized' }
    }

    const fullName = (formData.get('full_name') as string | null)?.trim() || ''
    const bio = (formData.get('bio') as string | null)?.trim() || ''
    const phone = (formData.get('phone') as string | null)?.trim() || ''
    const university = (formData.get('university') as string | null)?.trim() || ''
    const timezone = (formData.get('timezone') as string | null)?.trim() || ''
    const expertiseRaw = formData.getAll('expertise').map((v) => String(v)).filter(Boolean)
    const expertise = Array.from(new Set(expertiseRaw))

    // Optional new profile photo
    let photoUrl: string | null = null
    const photo = formData.get('photo')
    if (photo instanceof File && photo.size > 0) {
        const fileExt = photo.name.split('.').pop()
        const filePath = `${user.id}/photo-${Math.random()}.${fileExt}`

        const { error: uploadError } = await supabase.storage
            .from('mentor-assets')
            .upload(filePath, photo)

        if (uploadError) {
            console.error('Error uploading profile photo:', uploadError)
            return { error: 'Failed to upload photo. Please try again.' }
        }

        const {
            data: { publicUrl },
        } = supabase.storage.from('mentor-assets').getPublicUrl(filePath)
        photoUrl = publicUrl
    }

    // Update mentor-specific fields. RLS allows mentors to UPDATE their own row.
    const mentorUpdate: Record<string, any> = {
        bio,
        expertise,
        phone: phone || null,
        university: university || null,
        timezone: timezone || null,
        updated_at: new Date().toISOString(),
    }
    if (photoUrl) mentorUpdate.photo_url = photoUrl

    const { error: mentorError } = await supabase
        .from('mentors')
        .update(mentorUpdate)
        .eq('id', user.id)

    if (mentorError) {
        console.error('Error updating mentor profile:', mentorError)
        return { error: 'Failed to save profile. Please try again.' }
    }

    // Keep the display name on the shared profiles row in sync
    if (fullName) {
        const { error: nameError } = await supabase
            .from('profiles')
            .update({ full_name: fullName })
            .eq('id', user.id)

        if (nameError) {
            console.error('Error updating profile name:', nameError)
        }
    }

    revalidatePath('/dashboard/mentor/profile')
    return { success: true }
}
