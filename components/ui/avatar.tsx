'use client'

import * as React from 'react'
import { Avatar as AvatarPrimitive } from 'radix-ui'
import { cn } from '@/utils/lib'

/** Initials fall back to a tint picked from the name, so a person keeps the same colour everywhere. */
const TINTS = [
    'bg-tint-blue text-tint-blue-foreground',
    'bg-tint-violet text-tint-violet-foreground',
    'bg-tint-amber text-tint-amber-foreground',
    'bg-tint-green text-tint-green-foreground',
    'bg-tint-rose text-tint-rose-foreground',
]

function tintFor(name: string) {
    let h = 0
    for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
    return TINTS[h % TINTS.length]
}

/** First letter of the first and last words, skipping tags like "[MENTOR]". */
function initialsOf(name: string) {
    const letters = name
        .trim()
        .split(/\s+/)
        .map((word) => word.match(/\p{L}/u)?.[0])
        .filter((letter): letter is string => !!letter)
    if (letters.length === 0) return '?'
    if (letters.length === 1) return letters[0].toUpperCase()
    return (letters[0] + letters[letters.length - 1]).toUpperCase()
}

const SIZES = {
    xs: 'size-6 text-[10px]',
    sm: 'size-8 text-xs',
    md: 'size-10 text-sm',
    lg: 'size-12 text-base',
    xl: 'size-16 text-lg',
}

/**
 * Photo with a 1px black/10 outline inset by 1px, so light photos don't bleed
 * into a white card (better-ui); initials on a tint when there's no photo.
 */
function Avatar({
    name,
    src,
    size = 'md',
    className,
}: {
    name: string
    src?: string | null
    size?: keyof typeof SIZES
    className?: string
}) {
    return (
        <AvatarPrimitive.Root
            data-slot="avatar"
            className={cn('relative inline-flex shrink-0 overflow-hidden rounded-full select-none', SIZES[size], className)}
        >
            {src && (
                <AvatarPrimitive.Image
                    src={src}
                    alt=""
                    className="size-full object-cover outline -outline-offset-1 outline-1 outline-black/10"
                />
            )}
            <AvatarPrimitive.Fallback
                delayMs={src ? 300 : 0}
                className={cn('flex size-full items-center justify-center font-semibold', tintFor(name))}
            >
                {initialsOf(name)}
            </AvatarPrimitive.Fallback>
        </AvatarPrimitive.Root>
    )
}

export { Avatar }
