'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Calendar, LogOut, Settings, User, X } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { cn } from '@/utils/lib'
import type { NavItem } from './nav-items'

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
 * account actions that live in the sidebar footer on desktop. Follows the
 * bottom-sheet pattern already used by `help-support-button.tsx`.
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

    // Dismiss on navigation — Next links don't unmount this component.
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

    if (!open) return null

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

    return (
        <div
            // Above NotificationBell (z-999), which is fixed in the root layout
            // and would otherwise float over the sheet's backdrop.
            className="md:hidden fixed inset-0 z-[1000] flex items-end justify-center"
            role="dialog"
            aria-modal="true"
            aria-label="More navigation"
        >
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

            <div className="relative w-full bg-white rounded-t-3xl shadow-2xl max-h-[85dvh] flex flex-col pb-[env(safe-area-inset-bottom)]">
                {/* Grab handle + header */}
                <div className="shrink-0 px-5 pt-3 pb-3 border-b border-gray-100">
                    <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-gray-200" />
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-accent/10 text-accent flex items-center justify-center text-sm font-bold shrink-0 overflow-hidden">
                                {photoUrl ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={photoUrl} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    userName?.[0] || 'U'
                                )}
                            </div>
                            <div className="flex flex-col min-w-0">
                                <span className="text-sm font-semibold text-gray-900 truncate">
                                    {userName || 'User'}
                                </span>
                                <span className="text-[10px] text-gray-400 uppercase tracking-wider font-medium truncate">
                                    {role}
                                </span>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            aria-label="Close"
                            className="w-10 h-10 shrink-0 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 active:bg-gray-200 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                <div className="overflow-y-auto overscroll-contain px-3 py-3">
                    {role === 'student' && (
                        <button
                            type="button"
                            onClick={openBookSession}
                            className="w-full mb-3 inline-flex items-center justify-center gap-2 rounded-2xl bg-accent px-4 py-3.5 text-sm font-bold text-white shadow-md shadow-accent/20 active:scale-[0.99] transition-transform"
                        >
                            <Calendar className="w-4 h-4 shrink-0" />
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
                                    className={cn(
                                        'flex items-center justify-between gap-3 rounded-xl px-3 min-h-[48px] transition-colors',
                                        isActive
                                            ? 'bg-accent/10 text-accent'
                                            : 'text-gray-700 active:bg-gray-100'
                                    )}
                                >
                                    <span className="flex items-center gap-3 min-w-0">
                                        <item.icon
                                            className={cn(
                                                'w-5 h-5 shrink-0',
                                                isActive ? 'text-accent' : 'text-gray-400'
                                            )}
                                        />
                                        <span className="font-medium text-sm truncate">
                                            {item.name}
                                        </span>
                                    </span>
                                    {badge !== null && (
                                        <span
                                            className={cn(
                                                'shrink-0 rounded-full bg-red-500 text-white font-bold flex items-center justify-center',
                                                badge === 'dot'
                                                    ? 'w-2.5 h-2.5'
                                                    : 'min-w-[20px] h-5 px-1.5 text-xs'
                                            )}
                                        >
                                            {badge !== 'dot' && (badge > 9 ? '9+' : badge)}
                                        </span>
                                    )}
                                </Link>
                            )
                        })}

                        <div className="my-2 border-t border-gray-100" />

                        {role === 'student' && (
                            <Link
                                href="/dashboard/student/profile"
                                onClick={onClose}
                                className="flex items-center gap-3 rounded-xl px-3 min-h-[48px] text-gray-700 active:bg-gray-100 transition-colors"
                            >
                                <User className="w-5 h-5 text-gray-400 shrink-0" />
                                <span className="font-medium text-sm">My Profile</span>
                            </Link>
                        )}

                        <Link
                            href="/dashboard/settings"
                            onClick={onClose}
                            className="flex items-center gap-3 rounded-xl px-3 min-h-[48px] text-gray-700 active:bg-gray-100 transition-colors"
                        >
                            <Settings className="w-5 h-5 text-gray-400 shrink-0" />
                            <span className="font-medium text-sm">Settings</span>
                        </Link>

                        <button
                            type="button"
                            onClick={handleSignOut}
                            className="w-full flex items-center gap-3 rounded-xl px-3 min-h-[48px] text-red-600 active:bg-red-50 transition-colors"
                        >
                            <LogOut className="w-5 h-5 shrink-0" />
                            <span className="font-medium text-sm">Sign Out</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
