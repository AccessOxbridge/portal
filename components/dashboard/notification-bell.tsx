'use client'

import { useState, useEffect, useRef } from 'react'
import { Bell, X, Check, CheckCircle2 } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { formatDistanceToNow } from 'date-fns'
import { motion, AnimatePresence } from 'framer-motion'

interface Notification {
    id: string
    title: string
    message: string
    created_at: string
    viewed: boolean
    type: string
}

export default function NotificationBell() {
    const [notifications, setNotifications] = useState<Notification[]>([])
    const [isOpen, setIsOpen] = useState(false)
    const [unreadCount, setUnreadCount] = useState(0)
    const supabase = createClient()
    const dropdownRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
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
                    setUnreadCount((prev) => prev + 1)
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
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

        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('recipient_id', user.id)
            .order('created_at', { ascending: false })
            .limit(20)

        if (data) {
            setNotifications(data)
            setUnreadCount(data.filter(n => !n.viewed).length)
        }
    }

    const markAsRead = async (id: string) => {
        const { error } = await supabase
            .from('notifications')
            .update({ viewed: true })
            .eq('id', id)

        if (!error) {
            setNotifications(prev =>
                prev.map(n => n.id === id ? { ...n, viewed: true } : n)
            )
            setUnreadCount(prev => Math.max(0, prev - 1))
        }
    }

    const markAllAsRead = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { error } = await supabase
            .from('notifications')
            .update({ viewed: true })
            .eq('recipient_id', user.id)
            .eq('viewed', false)

        if (!error) {
            setNotifications(prev => prev.map(n => ({ ...n, viewed: true })))
            setUnreadCount(0)
        }
    }

    return (
        <div className="fixed top-5 right-4 bg-white/70 shadow rounded-full p-3 backdrop-blur-md z-999
        hover:scale-[1.2] cursor-pointer active:scale-[0.98] transition-all duration-300" ref={dropdownRef}>
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
                        className="absolute -left-80 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-100"
                    >
                        <div className="p-4 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
                            <h3 className="font-semibold text-gray-900">Notifications</h3>
                            {unreadCount > 0 && (
                                <button
                                    onClick={markAllAsRead}
                                    className="text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors flex items-center gap-1"
                                >
                                    <CheckCircle2 className="w-3 h-3" />
                                    Mark all as read
                                </button>
                            )}
                        </div>

                        <div className="max-h-[400px] overflow-y-auto">
                            {notifications.length > 0 ? (
                                <div className="divide-y divide-gray-50">
                                    {notifications.map((notification) => (
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
