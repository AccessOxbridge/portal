/**
 * A mentor's avatar, falling back to their initial on a coloured tile.
 *
 * Shared because the initial-only fallback was previously inlined in several
 * places, and each one silently stayed an initial even where the photo had been
 * fetched — the session rows in My Sessions fetched `mentor_photo_url` and
 * never rendered it. Keeping the fallback in one component means adding a photo
 * to a new surface is a one-line change.
 */

interface MentorAvatarProps {
    name: string
    photoUrl?: string | null
    /** Tailwind size classes; defaults to the 56px tile the session rows use. */
    sizeClassName?: string
    /** Fallback tile colours, so amber (pending) and accent (booked) both work. */
    fallbackClassName?: string
}

export default function MentorAvatar({
    name,
    photoUrl = null,
    sizeClassName = 'w-14 h-14',
    fallbackClassName = 'bg-accent text-white',
}: MentorAvatarProps) {
    if (photoUrl) {
        return (
            // Plain <img>: no remotePatterns are configured for the Supabase
            // storage host, and the rest of the dashboard renders avatars this
            // way (see sidebar.tsx).
            // eslint-disable-next-line @next/next/no-img-element
            <img
                src={photoUrl}
                alt=""
                className={`${sizeClassName} rounded-2xl object-cover shrink-0`}
            />
        )
    }

    return (
        <div
            className={`${sizeClassName} ${fallbackClassName} rounded-2xl flex items-center justify-center text-lg font-bold shrink-0`}
            aria-hidden
        >
            {name?.[0]?.toUpperCase() || 'M'}
        </div>
    )
}
