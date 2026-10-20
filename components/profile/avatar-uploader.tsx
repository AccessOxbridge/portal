'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Camera, CircleNotch as Loader2, Trash as Trash2 } from '@phosphor-icons/react/ssr'
import { buttonVariants } from '@/components/ui/button'
import { createClient } from '@/utils/supabase/client'
import {
    PHOTO_ACCEPT_ATTR,
    extForMime,
    validatePhotoUpload,
} from '@/lib/image-upload'

/**
 * Profile photo picker, writing to `profiles.photo_url`.
 *
 * It saves on choosing a file rather than waiting for the page's Save button.
 * A photo is a single self-contained change with nothing to validate against
 * the rest of the form, and on the student profile the Save button belongs to
 * the academic questionnaire — making a new photo depend on that form being
 * valid would be a trap.
 *
 * The same byte-sniffing validator the mentor upload uses runs here too, so an
 * iPhone HEIC is refused with an explanation instead of being stored as a
 * permanently broken image.
 */

interface AvatarUploaderProps {
    userId: string
    /** Current photo, if any. */
    photoUrl: string | null
    /** Seeds the fallback initial. */
    name: string
}

export default function AvatarUploader({ userId, photoUrl, name }: AvatarUploaderProps) {
    const router = useRouter()
    const supabase = createClient()
    const fileInputRef = useRef<HTMLInputElement>(null)

    const [preview, setPreview] = useState<string | null>(photoUrl)
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const save = async (nextUrl: string | null) => {
        const { error: updateError } = await supabase
            .from('profiles')
            .update({ photo_url: nextUrl })
            .eq('id', userId)

        if (updateError) throw updateError
    }

    const handleFile = async (file: File) => {
        setError(null)

        const validation = await validatePhotoUpload(file)
        if (!validation.ok) {
            setError(validation.error)
            return
        }

        setBusy(true)
        // Show the local file straight away — an upload plus a round trip is
        // long enough that the old photo sitting there reads as a failure.
        const localUrl = URL.createObjectURL(file)
        setPreview(localUrl)

        try {
            // A fresh name per upload rather than a fixed one: the bucket is
            // public and therefore CDN-cached, and overwriting a path would keep
            // serving the previous photo until that cache expired.
            const path = `${userId}/photo-${crypto.randomUUID()}.${extForMime(validation.mime)}`

            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(path, file, { contentType: validation.mime })

            if (uploadError) throw uploadError

            const {
                data: { publicUrl },
            } = supabase.storage.from('avatars').getPublicUrl(path)

            await save(publicUrl)
            setPreview(publicUrl)
            router.refresh()
        } catch (err) {
            console.error('Avatar upload failed:', err)
            setError('Could not save your photo. Please try again.')
            setPreview(photoUrl)
        } finally {
            URL.revokeObjectURL(localUrl)
            setBusy(false)
        }
    }

    const handleRemove = async () => {
        setError(null)
        setBusy(true)
        try {
            await save(null)
            setPreview(null)
            router.refresh()
        } catch (err) {
            console.error('Removing avatar failed:', err)
            setError('Could not remove your photo. Please try again.')
        } finally {
            setBusy(false)
        }
    }

    return (
        <div className="flex items-center gap-5">
            <div className="relative grid size-20 shrink-0 place-items-center overflow-hidden rounded-full bg-tint-blue text-2xl font-semibold text-tint-blue-foreground outline-1 -outline-offset-1 outline-black/10">
                {preview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={preview} alt="" className="w-full h-full object-cover" />
                ) : (
                    (name?.[0] || 'S').toUpperCase()
                )}

                {busy && (
                    <div className="absolute inset-0 grid place-items-center bg-black/40">
                        <Loader2 className="size-5 animate-spin text-white [animation-duration:600ms]" />
                    </div>
                )}
            </div>

            <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                    <button
                        type="button"
                        disabled={busy}
                        onClick={() => fileInputRef.current?.click()}
                        className={buttonVariants({ size: 'sm' })}
                    >
                        <Camera weight="fill" />
                        {preview ? 'Change photo' : 'Upload photo'}
                    </button>

                    {preview && (
                        <button
                            type="button"
                            disabled={busy}
                            onClick={handleRemove}
                            className={buttonVariants({ variant: 'destructive-ghost', size: 'sm' })}
                        >
                            <Trash2 />
                            Remove
                        </button>
                    )}
                </div>

                {error ? (
                    <p role="alert" className="mt-2 max-w-sm text-sm text-destructive">{error}</p>
                ) : (
                    <p className="mt-2 text-sm text-muted-foreground">
                        JPG, PNG, WebP or GIF up to 5MB. Square works best.
                    </p>
                )}
            </div>

            <input
                ref={fileInputRef}
                type="file"
                accept={PHOTO_ACCEPT_ATTR}
                className="hidden"
                onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handleFile(file)
                    e.target.value = ''
                }}
            />
        </div>
    )
}
