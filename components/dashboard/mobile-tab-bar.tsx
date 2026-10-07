'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { DotsThree as MoreHorizontal } from '@phosphor-icons/react/ssr'
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

    // Active tab: the Phosphor fill icon on a soft blue pill, the label in the
    // primary navy. Labels always show; 56px tall rows clear 44px touch targets.
    const tabClass = (active: boolean) =>
        cn(
            'relative flex min-h-[56px] min-w-0 flex-1 flex-col items-center justify-center gap-1 py-1.5 outline-none',
            '[-webkit-tap-highlight-color:transparent] focus-visible:bg-muted',
            active ? 'text-primary' : 'text-muted-foreground',
        )
    const iconPill = (active: boolean) =>
        cn(
            'relative grid h-8 w-14 place-items-center rounded-full transition-[background-color] duration-150 ease-out',
            active ? 'bg-tint-blue' : 'bg-transparent',
        )
    const countPill = 'absolute -top-1 left-1/2 ml-2 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold tabular-nums text-white ring-2 ring-card'

    return (
        <>
            <nav
                aria-label="Primary"
                className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur supports-[backdrop-filter]:bg-card/85"
            >
                <div className="flex items-stretch px-1">
                    {tabs.map((item) => {
                        const isActive = pathname === item.href
                        const badge = badgeFor(item.name)
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                aria-current={isActive ? 'page' : undefined}
                                className={tabClass(isActive)}
                            >
                                <span className={iconPill(isActive)}>
                                    <item.icon weight={isActive ? 'fill' : 'regular'} className="size-6" />
                                    {badge !== null &&
                                        (badge === 'dot' ? (
                                            <span className="absolute top-0 left-1/2 ml-2.5 size-2.5 rounded-full bg-destructive ring-2 ring-card" />
                                        ) : (
                                            <span className={countPill}>{badge > 9 ? '9+' : badge}</span>
                                        ))}
                                </span>
                                <span
                                    className={cn(
                                        'max-w-full truncate px-0.5 text-[11px] leading-none',
                                        isActive ? 'font-semibold' : 'font-medium'
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
                        className={tabClass(moreOpen)}
                    >
                        <span className={iconPill(moreOpen)}>
                            <MoreHorizontal weight="bold" className="size-6" />
                            {moreNeedsAttention && (
                                <span className="absolute top-0 left-1/2 ml-2.5 size-2.5 rounded-full bg-destructive ring-2 ring-card" />
                            )}
                        </span>
                        <span className={cn('text-[11px] leading-none', moreOpen ? 'font-semibold' : 'font-medium')}>More</span>
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
