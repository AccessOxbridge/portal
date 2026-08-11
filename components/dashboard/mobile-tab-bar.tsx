'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { MoreHorizontal } from 'lucide-react'
import { cn } from '@/utils/lib'
import { navigation, MOBILE_TAB_NAMES, MOBILE_TAB_LABELS, type NavItem } from './nav-items'
import { useUnreadMessages } from './use-unread-messages'
import MobileMoreSheet from './mobile-more-sheet'

interface MobileTabBarProps {
    role: string
    userName: string
    userId?: string
    photoUrl?: string | null
    pendingReportsCount?: number
    pendingRequestsCount?: number
    onboardingIncomplete?: boolean
    trainingComplete?: boolean
}

/**
 * Bottom tab bar for phones. Hidden from `md` up, where the sidebar takes over.
 * Shows four role-specific destinations plus a "More" sheet holding the rest.
 */
export default function MobileTabBar({
    role,
    userName,
    userId,
    photoUrl,
    pendingReportsCount = 0,
    pendingRequestsCount = 0,
    onboardingIncomplete = false,
    trainingComplete = false,
}: MobileTabBarProps) {
    const pathname = usePathname()
    const [moreOpen, setMoreOpen] = useState(false)

    // Mirrors the sidebar's admin-dev handling: which nav set to show depends on
    // which section of the dashboard you're currently in.
    let effectiveRole = role
    if (role === 'admin-dev') {
        if (pathname.startsWith('/dashboard/student')) effectiveRole = 'student'
        else if (pathname.startsWith('/dashboard/mentor')) effectiveRole = 'mentor'
        else if (pathname.startsWith('/dashboard/admin')) effectiveRole = 'admin-dev'
    }

    const unreadMessagesCount = useUnreadMessages(userId, effectiveRole)

    const allItems = useMemo(() => {
        let items = navigation[effectiveRole] || navigation.student
        if (effectiveRole === 'mentor' && trainingComplete) {
            items = items.filter((item) => item.name !== 'Training')
        }
        return items
    }, [effectiveRole, trainingComplete])

    const tabNames = MOBILE_TAB_NAMES[effectiveRole]

    const { tabs, overflow } = useMemo(() => {
        // Roles without a curated tab list (admin / admin-dev) fall back to the
        // first four nav items so the bar is never empty.
        const names = tabNames ?? allItems.slice(0, 4).map((i) => i.name)
        const byName = new Map(allItems.map((item) => [item.name, item]))
        const picked = names
            .map((name) => byName.get(name))
            .filter((item): item is NavItem => Boolean(item))
        const pickedNames = new Set(picked.map((i) => i.name))
        return {
            tabs: picked,
            overflow: allItems.filter((item) => !pickedNames.has(item.name)),
        }
    }, [allItems, tabNames])

    const badgeFor = (name: string): number | 'dot' | null => {
        if (name === 'Messages' && unreadMessagesCount > 0) return unreadMessagesCount
        if (name === 'Requests' && effectiveRole === 'mentor' && pendingRequestsCount > 0) {
            return pendingRequestsCount
        }
        if (name === 'Reports' && effectiveRole === 'mentor' && pendingReportsCount > 0) {
            return pendingReportsCount
        }
        if (
            name === 'Training' &&
            effectiveRole === 'mentor' &&
            onboardingIncomplete &&
            !trainingComplete
        ) {
            return 'dot'
        }
        return null
    }

    // Anything hidden behind "More" that needs attention surfaces as a dot on the
    // More tab itself, so a phone user isn't blind to it.
    const moreNeedsAttention = overflow.some((item) => badgeFor(item.name) !== null)

    return (
        <>
            <nav
                aria-label="Primary"
                className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-gray-200 pb-[env(safe-area-inset-bottom)] shadow-[0_-1px_12px_rgba(0,0,0,0.06)]"
            >
                <div className="flex items-stretch">
                    {tabs.map((item) => {
                        const isActive = pathname === item.href
                        const badge = badgeFor(item.name)
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                aria-current={isActive ? 'page' : undefined}
                                className={cn(
                                    'relative flex-1 min-w-0 flex flex-col items-center justify-center gap-1 py-2 min-h-[56px] transition-colors',
                                    isActive ? 'text-accent' : 'text-gray-400 active:text-gray-600'
                                )}
                            >
                                <span className="relative">
                                    <item.icon
                                        className={cn('w-6 h-6', isActive && 'stroke-[2.25]')}
                                    />
                                    {badge !== null && (
                                        <span
                                            className={cn(
                                                'absolute -top-1.5 -right-2 rounded-full bg-red-500 text-white font-bold flex items-center justify-center',
                                                badge === 'dot'
                                                    ? 'w-2.5 h-2.5'
                                                    : 'min-w-[18px] h-[18px] px-1 text-[10px]'
                                            )}
                                        >
                                            {badge !== 'dot' &&
                                                (badge > 9 ? '9+' : badge)}
                                        </span>
                                    )}
                                </span>
                                <span
                                    className={cn(
                                        'text-[10px] leading-none font-semibold truncate max-w-full px-0.5',
                                        isActive ? 'text-accent' : 'text-gray-500'
                                    )}
                                >
                                    {MOBILE_TAB_LABELS[item.name] ?? item.name}
                                </span>
                            </Link>
                        )
                    })}

                    <button
                        type="button"
                        onClick={() => setMoreOpen(true)}
                        aria-label="More navigation"
                        aria-expanded={moreOpen}
                        className={cn(
                            'relative flex-1 min-w-0 flex flex-col items-center justify-center gap-1 py-2 min-h-[56px] transition-colors',
                            moreOpen ? 'text-accent' : 'text-gray-400 active:text-gray-600'
                        )}
                    >
                        <span className="relative">
                            <MoreHorizontal className="w-6 h-6" />
                            {moreNeedsAttention && (
                                <span className="absolute -top-1 -right-1.5 w-2.5 h-2.5 rounded-full bg-red-500" />
                            )}
                        </span>
                        <span
                            className={cn(
                                'text-[10px] leading-none font-semibold',
                                moreOpen ? 'text-accent' : 'text-gray-500'
                            )}
                        >
                            More
                        </span>
                    </button>
                </div>
            </nav>

            <MobileMoreSheet
                open={moreOpen}
                onClose={() => setMoreOpen(false)}
                items={overflow}
                role={effectiveRole}
                userName={userName}
                photoUrl={photoUrl}
                badgeFor={badgeFor}
            />
        </>
    )
}
