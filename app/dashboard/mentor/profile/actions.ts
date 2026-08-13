'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { validatePhotoUpload, extForMime } from '@/lib/image-upload'
import type { TablesUpdate } from '@/utils/supabase/types'

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
        const validation = await validatePhotoUpload(photo)
        if (!validation.ok) {
            return { error: validation.error }
        }

        const filePath = `${user.id}/photo-${Math.random()}.${extForMime(validation.mime)}`

        const { error: uploadError } = await supabase.storage
            .from('mentor-assets')
            .upload(filePath, photo, { contentType: validation.mime })

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
    // Typed against the generated schema rather than Record<string, any>, so a
    // renamed or removed column fails here instead of silently no-opping.
    const mentorUpdate: TablesUpdate<'mentors'> = {
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

    // Keep the shared profiles row in sync. The photo is mirrored as well as
    // the name so `profiles.photo_url` is dependable for every role: students
    // write only there, and anything reading an avatar off a plain profiles
    // join would otherwise find nothing for a mentor.
    const profileUpdate: TablesUpdate<'profiles'> = {}
    if (fullName) profileUpdate.full_name = fullName
    if (photoUrl) profileUpdate.photo_url = photoUrl

    if (Object.keys(profileUpdate).length > 0) {
        const { error: profileError } = await supabase
            .from('profiles')
            .update(profileUpdate)
            .eq('id', user.id)

        if (profileError) {
            console.error('Error updating shared profile row:', profileError)
        }
    }

    revalidatePath('/dashboard/mentor/profile')
    return { success: true }
}
