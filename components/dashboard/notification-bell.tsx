'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { Bell, Check, CheckCircle2 } from 'lucide-react'
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
        pathname?.includes('/signup') ||
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
        <div className="fixed top-5 right-4 bg-white/70 shadow rounded-full p-3 backdrop-blur-md z-999 cursor-pointer" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 rounded-xl  transition-all group"
            >
                <Bell className="w-5 h-5 fill-accent" />
                {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white border-2 border-white">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.1 }}
                        className="absolute left-auto right-0 w-[min(20rem,calc(100vw-2rem))] md:left-[-20rem] md:right-auto md:w-80 mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-100"
                    >
                        <div className="p-4 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
                            <h3 className="font-semibold text-gray-900">Notifications</h3>
                            <div className="flex items-center gap-3">
                                {unreadCount > 0 && (
                                    <button
                                        type="button"
                                        onClick={() => markAllAsRead()}
                                        className="text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors flex items-center gap-1"
                                    >
                                        <CheckCircle2 className="w-3 h-3" />
                                        Mark all as read
                                    </button>
                                )}
                                {visibleNotifications.length > 0 && (
                                    <button
                                        type="button"
                                        onClick={() => clearAll()}
                                        className="text-xs text-gray-500 hover:text-gray-700 font-medium transition-colors"
                                    >
                                        Clear all
                                    </button>
                                )}
                            </div>
                        </div>

                        <div
                            ref={listRef}
                            className="max-h-[400px] overflow-y-auto overscroll-contain"
                            onWheel={stopScrollBleed}
                        >
                            {visibleNotifications.length > 0 ? (
                                <div className="divide-y divide-gray-50">
                                    {visibleNotifications.map((notification) => (
                                        <div
                                            key={notification.id}
                                            className={`p-4 transition-colors ${!notification.viewed ? 'bg-blue-50/30' : 'hover:bg-gray-50'
                                                }`}
                                        >
                                            <div className="flex justify-between items-start gap-3">
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-semibold text-gray-900">
                                                        {notification.title}
                                                    </p>
                                                    <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                                                        {notification.message}
                                                    </p>
                                                    <p className="text-[10px] text-gray-400 mt-2">
                                                        {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                                                    </p>
                                                </div>
                                                {!notification.viewed && (
                                                    <button
                                                        type="button"
                                                        onClick={() => markAsRead(notification.id)}
                                                        className="p-1 rounded-md text-blue-600 hover:bg-blue-100 transition-colors shrink-0"
                                                        title="Mark as read"
                                                    >
                                                        <Check className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="p-8 text-center bg-white">
                                    <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
                                        <Bell className="w-6 h-6 text-gray-300" />
                                    </div>
                                    <p className="text-gray-500 text-sm font-medium">No notifications yet</p>
                                    <p className="text-gray-400 text-xs mt-1">We'll alert you when something happens.</p>
                                </div>
                            )}
                        </div>

                        <div className="p-3 border-t border-gray-50 bg-gray-50/30 text-center">
                            <span className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">
                                Private & Secure
                            </span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
