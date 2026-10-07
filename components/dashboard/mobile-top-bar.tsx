'use client'

import Link from 'next/link'
import Image from 'next/image'

/**
 * Slim app bar for phones, hidden from `md` up.
 *
 * Deliberately navy and left-weighted: the logo mark uses
 * `mix-blend-mode: screen`, which renders invisible on a white background, and
 * the right-hand side is reserved for `NotificationBell` and
 * `CreditsFloatingButton`, both `position: fixed` at `top-2.5` on phones, so
 * their 44px chips sit centred in this 64px band.
 */
export default function MobileTopBar() {
    return (
        <header className="md:hidden sticky top-0 z-30 h-16 bg-sidebar border-b border-sidebar-border">
            <div className="h-full flex items-center px-4">
                <Link
                    href="/dashboard"
                    aria-label="Access Oxbridge"
                    className="flex items-center gap-2.5 min-w-0"
                >
                    <Image
                        src="/logo.png"
                        alt=""
                        width={32}
                        height={32}
                        className="shrink-0 [mix-blend-mode:screen]"
                    />
                    {/* Wordmark only once there's room beside the floating
                        credits pill, which sits beside the bell. */}
                    <span className="hidden sm:inline text-base font-semibold tracking-tight text-sidebar-primary whitespace-nowrap">
                        Access Oxbridge
                    </span>
                </Link>
            </div>
        </header>
    )
}
