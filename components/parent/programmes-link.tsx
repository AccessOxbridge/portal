'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Sparkle } from '@phosphor-icons/react/ssr'

const HREF = '/dashboard/parent/programmes'

/**
 * "See Oxbridge Programmes", a small link in the top-right corner of every
 * parent page, beside the bell. Same fixed cluster position as the student's
 * hours pill. Hidden on the programmes page itself.
 */
export function ProgrammesLink() {
    const pathname = usePathname()
    if (pathname === HREF) return null
    return (
        <div data-floating-ui className="fixed top-2.5 right-16 z-100 flex h-11 items-center md:top-5 md:right-[4.25rem]">
            <Link
                href={HREF}
                className="gold-rim-button flex h-9 items-center gap-1.5 rounded-full px-3.5 text-sm font-medium text-foreground outline-none transition-[box-shadow,scale] duration-150 ease-out active:scale-[0.96] focus-visible:ring-[3px] focus-visible:ring-ring/40"
            >
                <Sparkle weight="fill" className="size-4 text-gold-foreground" aria-hidden />
                {/* Phones keep it short so it fits beside the bell. */}
                <span className="sm:hidden">Programmes</span>
                <span className="hidden sm:inline">See Oxbridge Programmes</span>
            </Link>
        </div>
    )
}
