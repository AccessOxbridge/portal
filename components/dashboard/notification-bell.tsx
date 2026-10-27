'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { Bell, Check, CheckCircle as CheckCircle2 } from '@phosphor-icons/react/ssr'
import { createClient } from '@/utils/supabase/client'
import { formatDistanceToNow } from 'date-fns'
import { motion, AnimatePresence } from 'framer-motion'
import { usePathname } from 'next/navigation'

const NOTIFICATION_VISIBLE_MS = 2 * 60 * 60 * 1000 // Hide after 2 hours

interface Notification {
    id: string
    title: string
    message: string
    created_at: string
    viewed: boolean
    type: string
}

export default function NotificationBell() {
    const pathname = usePathname()
    const [notifications, setNotifications] = useState<Notification[]>([])
    const [isOpen, setIsOpen] = useState(false)
    const [tick, setTick] = useState(0) // Updates every minute so list re-filters by 2h window
    const supabase = createClient()
    const dropdownRef = useRef<HTMLDivElement>(null)
    const listRef = useRef<HTMLDivElement>(null)

    const stopScrollBleed = (e: React.WheelEvent<HTMLDivElement>) => {
        const el = listRef.current
        if (!el) return
        const { scrollTop, scrollHeight, clientHeight } = el
        const atTop = scrollTop <= 0 && e.deltaY <= 0
        const atBottom = scrollTop + clientHeight >= scrollHeight && e.deltaY >= 0
        if (atTop || atBottom) {
            e.preventDefault()
            e.stopPropagation()
        }
    }

    const visibleNotifications = useMemo(() => {
        const cutoff = Date.now() - NOTIFICATION_VISIBLE_MS
        return notifications
            .filter(n => new Date(n.created_at).getTime() >= cutoff)
            // Temporarily hide credit deduction notifications from the bell
            .filter(n => !(n.title === 'Credits deducted for session'))
    }, [notifications, tick])

    const unreadCount = useMemo(
        () => visibleNotifications.filter(n => !n.viewed).length,
        [visibleNotifications]
    )

    // Hide notification bell on auth pages and mentor onboarding
    const isAuthPage = pathname?.includes('/login') ||
        pathname === '/account-disabled' ||
        pathname?.includes('/signup') ||
        pathname?.includes('/become-a-mentor') ||
        pathname?.includes('/forgot-password') ||
        pathname?.includes('/reset-password') ||
        pathname?.includes('/verify-email') ||
        pathname?.includes('/onboarding')

    useEffect(() => {
        if (isAuthPage) return
        fetchNotifications()

        // Subscribe to real-time updates
        const channel = supabase
            .channel('public:notifications')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                },
                (payload) => {
                    const newNotification = payload.new as Notification
                    setNotifications((prev) => [newNotification, ...prev])
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [isAuthPage])

    // Re-run 2h filter every minute so older notifications drop off the list
    useEffect(() => {
        const interval = setInterval(() => setTick(t => t + 1), 60 * 1000)
        return () => clearInterval(interval)
    }, [])

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const fetchNotifications = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const since = new Date(Date.now() - NOTIFICATION_VISIBLE_MS).toISOString()
        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('recipient_id', user.id)
            .gte('created_at', since)
            .order('created_at', { ascending: false })
            .limit(20)

        if (data) {
            setNotifications(data)
        }
    }

    const markAsRead = async (id: string) => {
        const { error } = await supabase
            .from('notifications')
            .update({ viewed: true })
            .eq('id', id)

        if (error) {
            console.error('[NotificationBell] markAsRead failed:', error)
            return
        }
        setNotifications(prev =>
            prev.map(n => n.id === id ? { ...n, viewed: true } : n)
        )
    }

    const markAllAsRead = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { error } = await supabase
            .from('notifications')
            .update({ viewed: true })
            .eq('recipient_id', user.id)

        if (error) {
            console.error('[NotificationBell] markAllAsRead failed:', error)
            return
        }
        setNotifications(prev => prev.map(n => ({ ...n, viewed: true })))
    }

    const clearAll = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { error } = await supabase
            .from('notifications')
            .delete()
            .eq('recipient_id', user.id)

        if (error) {
            console.error('[NotificationBell] clearAll failed:', error)
            return
        }
        setNotifications([])
    }

    if (isAuthPage) return null

    return (
        // Shares its shape with CreditsFloatingButton so the two read as one
        // control cluster: same 44px height, white chip and ring, 8px apart.
        // On phones it sits centred in MobileTopBar's 64px band.
        <div
            data-floating-ui
            className="fixed top-2.5 right-3 md:top-5 md:right-4 z-999"
            ref={dropdownRef}
        >
            <button
                onClick={() => setIsOpen(!isOpen)}
                aria-label="Notifications"
                aria-expanded={isOpen}
                className="relative grid size-11 place-items-center rounded-full border border-transparent bg-card text-primary shadow-border outline-none transition-[box-shadow,scale] duration-150 ease-out hover:shadow-border-hover active:scale-[0.96] focus-visible:ring-[3px] focus-visible:ring-ring/40"
            >
                <Bell weight={unreadCount > 0 ? 'fill' : 'regular'} className="size-5" />
                {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold tabular-nums text-white ring-2 ring-card">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        // Grows out of the bell (top right) from 0.96 on the strong
                        // ease-out; the exit is quicker than the entrance.
                        initial={{ opacity: 0, scale: 0.96 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.1 } }}
                        transition={{ duration: 0.15, ease: [0.23, 1, 0.32, 1] }}
                        style={{ transformOrigin: 'top right' }}
                        className="absolute right-0 mt-2 w-[min(22rem,calc(100vw-1.5rem))] overflow-hidden rounded-card border border-transparent bg-popover text-popover-foreground shadow-overlay z-100"
                    >
                        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
                            <h3 className="text-base font-semibold text-foreground">Notifications</h3>
                            <div className="flex items-center gap-3">
                                {unreadCount > 0 && (
                                    <button
                                        type="button"
                                        onClick={() => markAllAsRead()}
                                        className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium text-brand transition-colors duration-150 hover:bg-tint-blue"
                                    >
                                        <CheckCircle2 className="size-3.5" />
                                        Mark all as read
                                    </button>
                                )}
                                {visibleNotifications.length > 0 && (
                                    <button
                                        type="button"
                                        onClick={() => clearAll()}
                                        className="rounded-full px-2 py-1 text-xs font-medium text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground"
                                    >
                                        Clear all
                                    </button>
                                )}
                            </div>
                        </div>

                        <div
                            ref={listRef}
                            className="max-h-[min(400px,60dvh)] overflow-y-auto overscroll-contain"
                            onWheel={stopScrollBleed}
                        >
                            {visibleNotifications.length > 0 ? (
                                <div className="divide-y divide-border">
                                    {visibleNotifications.map((notification) => (
                                        <div
                                            key={notification.id}
                                            className={`px-4 py-3 transition-colors duration-150 ${!notification.viewed ? 'bg-tint-blue/60' : 'hover:bg-muted/60'
                                                }`}
                                        >
                                            <div className="flex justify-between items-start gap-3">
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-foreground">
                                                        {notification.title}
                                                    </p>
                                                    <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground text-pretty">
                                                        {notification.message}
                                                    </p>
                                                    <p className="mt-1.5 text-xs text-muted-foreground">
                                                        {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                                                    </p>
                                                </div>
                                                {!notification.viewed && (
                                                    <button
                                                        type="button"
                                                        onClick={() => markAsRead(notification.id)}
                                                        className="grid size-8 shrink-0 place-items-center rounded-full text-brand transition-colors duration-150 hover:bg-tint-blue"
                                                        title="Mark as read"
                                                        aria-label="Mark as read"
                                                    >
                                                        <Check weight="bold" className="size-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="px-6 py-10 text-center">
                                    <div className="mx-auto mb-3 grid size-12 place-items-center rounded-full bg-tint-blue text-tint-blue-foreground">
                                        <Bell weight="duotone" className="size-6" />
                                    </div>
                                    <p className="text-sm font-medium text-foreground">No notifications yet</p>
                                    <p className="mt-1 text-sm text-muted-foreground">We'll alert you when something happens.</p>
                                </div>
                            )}
                        </div>

                        <div className="border-t border-border px-4 py-2.5 text-center">
                            <span className="text-xs text-muted-foreground">
                                Private & secure
                            </span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
