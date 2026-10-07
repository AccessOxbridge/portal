'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CalendarBlank as Calendar, SignOut as LogOut, Gear as Settings, User } from '@phosphor-icons/react/ssr'
import { createClient } from '@/utils/supabase/client'
import { cn } from '@/utils/lib'
import type { NavItem } from './nav-items'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Avatar } from '@/components/ui/avatar'

interface MobileMoreSheetProps {
    open: boolean
    onClose: () => void
    items: NavItem[]
    role: string
    userName: string
    photoUrl?: string | null
    badgeFor: (name: string) => number | 'dot' | null
}

/**
 * Slide-up sheet holding the nav items that don't fit on the tab bar, plus the
 * account actions that live in the sidebar footer on desktop. Built on the
 * shared Dialog, which is a bottom sheet on phones (swipe down to close).
 */
export default function MobileMoreSheet({
    open,
    onClose,
    items,
    role,
    userName,
    photoUrl,
    badgeFor,
}: MobileMoreSheetProps) {
    const pathname = usePathname()

    // Dismiss on navigation: Next links don't unmount this component.
    useEffect(() => {
        onClose()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pathname])

    useEffect(() => {
        if (!open) return
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose()
        }
        window.addEventListener('keydown', onKeyDown)
        // Stop the page behind the sheet from scrolling with it.
        const previousOverflow = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        return () => {
            window.removeEventListener('keydown', onKeyDown)
            document.body.style.overflow = previousOverflow
        }
    }, [open, onClose])

    const handleSignOut = async () => {
        const supabase = createClient()
        await supabase.auth.signOut()
        window.location.href = '/login'
    }

    const openBookSession = () => {
        onClose()
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('open-book-session'))
        }
    }

    const row = cn(
        'flex min-h-12 items-center gap-3 rounded-control px-3 text-base outline-none',
        'transition-colors duration-150 active:bg-muted focus-visible:bg-muted',
    )

    return (
        <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
            <DialogContent
                aria-describedby={undefined}
                // Phones only: from md up the sidebar replaces the tab bar.
                className="md:hidden"
            >
                <DialogTitle className="sr-only">More navigation</DialogTitle>

                {/* Who's signed in */}
                <div className="flex items-center gap-3 border-b border-border px-5 pb-4 pt-1 pe-14">
                    <Avatar name={userName || 'User'} src={photoUrl} size="md" />
                    <div className="flex min-w-0 flex-col">
                        <span className="truncate text-base font-semibold text-foreground">{userName || 'User'}</span>
                        <span className="truncate text-sm capitalize text-muted-foreground">{role}</span>
                    </div>
                </div>

                <div className="min-h-0 overflow-y-auto overscroll-contain px-3 py-3">
                    {role === 'student' && (
                        <button
                            type="button"
                            onClick={openBookSession}
                            className="mb-3 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary px-4 text-base font-medium text-primary-foreground transition-[scale,background-color] duration-150 ease-out hover:bg-primary/90 active:scale-[0.96]"
                        >
                            <Calendar weight="bold" className="size-5 shrink-0" />
                            Book a session
                        </button>
                    )}

                    <div className="space-y-0.5">
                        {items.map((item) => {
                            const isActive = pathname === item.href
                            const badge = badgeFor(item.name)
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={onClose}
                                    aria-current={isActive ? 'page' : undefined}
                                    className={cn(row, 'justify-between', isActive ? 'bg-tint-blue font-medium text-tint-blue-foreground' : 'text-foreground')}
                                >
                                    <span className="flex min-w-0 items-center gap-3">
                                        <item.icon
                                            weight={isActive ? 'fill' : 'regular'}
                                            className={cn('size-5 shrink-0', isActive ? 'text-tint-blue-foreground' : 'text-muted-foreground')}
                                        />
                                        <span className="truncate">{item.name}</span>
                                    </span>
                                    {badge !== null &&
                                        (badge === 'dot' ? (
                                            <span className="size-2.5 shrink-0 rounded-full bg-destructive" />
                                        ) : (
                                            <span className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-destructive px-1.5 text-xs font-semibold tabular-nums text-white">
                                                {badge > 9 ? '9+' : badge}
                                            </span>
                                        ))}
                                </Link>
                            )
                        })}

                        <div className="my-2 h-px bg-border" />

                        {role === 'student' && (
                            <Link href="/dashboard/student/profile" onClick={onClose} className={cn(row, 'text-foreground')}>
                                <User className="size-5 shrink-0 text-muted-foreground" />
                                <span>My profile</span>
                            </Link>
                        )}

                        <Link href="/dashboard/settings" onClick={onClose} className={cn(row, 'text-foreground')}>
                            <Settings className="size-5 shrink-0 text-muted-foreground" />
                            <span>Settings</span>
                        </Link>

                        <button type="button" onClick={handleSignOut} className={cn(row, 'w-full text-destructive active:bg-tint-rose')}>
                            <LogOut className="size-5 shrink-0" />
                            <span>Sign out</span>
                        </button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
