'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
    Calendar,
    Settings,
    LogOut,
    Search,
    CheckCircle,
    ChevronDown,
    ChevronLeft,
    ChevronUp,
    AlertCircle,
    User,
} from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { cn } from '@/utils/lib'
import { Logo } from '../logo'
import { navigation, studentSections } from './nav-items'
import { useUnreadMessages } from './use-unread-messages'

interface SidebarProps {
    role: string;
    userName: string;
    userId?: string;
    photoUrl?: string | null;
    pendingReportsCount?: number;
    pendingRequestsCount?: number;
    onboardingIncomplete?: boolean;
    trainingComplete?: boolean;
    studentHelpCount?: number;
    collapsed?: boolean;
    onToggleCollapse?: () => void;
}


export default function Sidebar({
    role,
    userName,
    userId,
    photoUrl,
    pendingReportsCount = 0,
    pendingRequestsCount = 0,
    onboardingIncomplete = false,
    trainingComplete = false,
    studentHelpCount = 0,
    collapsed = false,
    onToggleCollapse,
}: SidebarProps) {
    const pathname = usePathname()
    const supabase = createClient()
    const [expandedSections, setExpandedSections] = useState<string[]>(['Events'])
    const [searchQuery, setSearchQuery] = useState('')
    const [profileMenuOpen, setProfileMenuOpen] = useState(false)
    const searchInputRef = useRef<HTMLInputElement>(null)
    const profileMenuRef = useRef<HTMLDivElement>(null)

    // Custom sidebar tab order (persisted per user + role in localStorage)
    const [navOrder, setNavOrder] = useState<string[]>([])
    const [draggingName, setDraggingName] = useState<string | null>(null)
    const [dragOverName, setDragOverName] = useState<string | null>(null)
    const dragNameRef = useRef<string | null>(null)

    // Determine effective role for admin-dev to show relevant sidebar on different dashboard pages
    let effectiveRole = role
    if (role === 'admin-dev') {
        if (pathname.startsWith('/dashboard/student')) effectiveRole = 'student'
        else if (pathname.startsWith('/dashboard/mentor')) effectiveRole = 'mentor'
        else if (pathname.startsWith('/dashboard/admin')) effectiveRole = 'admin-dev'
    }

    const unreadMessagesCount = useUnreadMessages(userId, effectiveRole)

    // localStorage key for this user's tab order, scoped per role view
    const orderStorageKey = useMemo(
        () => `sidebar-order-${effectiveRole}${userId ? `-${userId}` : ''}`,
        [effectiveRole, userId]
    )

    // Load saved tab order whenever the role view (or user) changes
    useEffect(() => {
        if (typeof window === 'undefined') return
        try {
            const saved = window.localStorage.getItem(orderStorageKey)
            setNavOrder(saved ? JSON.parse(saved) : [])
        } catch {
            setNavOrder([])
        }
    }, [orderStorageKey])

    const persistNavOrder = (names: string[]) => {
        setNavOrder(names)
        try {
            window.localStorage.setItem(orderStorageKey, JSON.stringify(names))
        } catch {
            // ignore persistence errors (e.g. storage disabled)
        }
    }

    useEffect(() => {
        if (collapsed) setProfileMenuOpen(false)
    }, [collapsed])

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault()
                searchInputRef.current?.focus()
                searchInputRef.current?.select()
            }
            if (e.key === 'Escape' && document.activeElement === searchInputRef.current) {
                searchInputRef.current?.blur()
                setSearchQuery('')
            }
            if (e.key === 'Escape') setProfileMenuOpen((open) => (open ? false : open))
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [])

    // Close profile drop-up when clicking outside (student only)
    useEffect(() => {
        if (effectiveRole !== 'student' || !profileMenuOpen) return
        const handleClickOutside = (e: MouseEvent) => {
            if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
                setProfileMenuOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [effectiveRole, profileMenuOpen])

    // Base nav items for the current role, reordered to match the saved custom order.
    // Items not present in the saved order keep their original position (appended in
    // original order), so newly added tabs still show up.
    const orderedBaseItems = useMemo(() => {
        const baseItems = navigation[effectiveRole as keyof typeof navigation] || navigation.student
        if (navOrder.length === 0) return baseItems
        const remaining = new Map(baseItems.map((item) => [item.name, item]))
        const ordered: typeof baseItems = []
        for (const name of navOrder) {
            const item = remaining.get(name)
            if (item) {
                ordered.push(item)
                remaining.delete(name)
            }
        }
        for (const item of remaining.values()) ordered.push(item)
        return ordered
    }, [effectiveRole, navOrder])

    // Filter menu items based on search query; hide Training from mentor when complete
    const filteredMenuItems = useMemo(() => {
        let items = orderedBaseItems
        if (effectiveRole === 'mentor' && trainingComplete) {
            items = items.filter((item) => item.name !== 'Training')
        }
        if (!searchQuery) return items
        return items.filter(item =>
            item.name.toLowerCase().includes(searchQuery.toLowerCase())
        )
    }, [orderedBaseItems, effectiveRole, searchQuery, trainingComplete])

    // Drag-and-drop reordering: only active when expanded and not searching
    const dndEnabled = !collapsed && searchQuery === ''

    const handleNavDrop = (targetName: string) => {
        const dragged = dragNameRef.current
        dragNameRef.current = null
        setDraggingName(null)
        setDragOverName(null)
        if (!dragged || dragged === targetName) return
        const names = orderedBaseItems.map((item) => item.name)
        const from = names.indexOf(dragged)
        const to = names.indexOf(targetName)
        if (from === -1 || to === -1) return
        names.splice(from, 1)
        names.splice(to, 0, dragged)
        persistNavOrder(names)
    }

    // Filter student sections based on search query
    const filteredStudentSections = useMemo(() => {
        if (!searchQuery) return studentSections
        return studentSections.map(section => ({
            ...section,
            subsections: section.subsections.filter(sub =>
                sub.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                section.name.toLowerCase().includes(searchQuery.toLowerCase())
            )
        })).filter(section => section.subsections.length > 0 || section.name.toLowerCase().includes(searchQuery.toLowerCase()))
    }, [searchQuery])

    const handleSignOut = async () => {
        await supabase.auth.signOut()
        window.location.href = '/login'
    }

    return (
        <aside
            className={cn(
                // Hidden below `md` — phones get MobileTopBar + MobileTabBar instead.
                'bg-accent border-r border-white/10 hidden md:flex flex-col h-screen fixed left-0 top-0 z-50 transition-[width] duration-300 ease-in-out',
                collapsed ? 'w-[4.5rem]' : 'w-64'
            )}
        >
            {onToggleCollapse && (
                <button
                    type="button"
                    onClick={onToggleCollapse}
                    aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                    className={cn(
                        'absolute z-[60] top-7 flex h-6 w-6 items-center justify-center rounded-full',
                        'border border-white/20 bg-accent text-white/80 shadow-lg',
                        'hover:bg-white/15 hover:text-white hover:border-white/30 transition-colors -right-3'
                    )}
                >
                    <ChevronLeft
                        className={cn('h-3.5 w-3.5 stroke-[2.5]', collapsed && 'rotate-180')}
                    />
                </button>
            )}

            {/* Top Branding & Search */}
            <div className={cn('pb-2', collapsed ? 'px-2 pt-4' : 'p-6 pr-8')}>
                <div className={cn('mb-6', collapsed ? 'flex justify-center' : 'mb-8')}>
                    <Logo
                        size={collapsed ? 'default' : 'lg'}
                        iconOnly={collapsed}
                        textColor="text-white"
                        className={collapsed ? 'justify-center' : 'justify-start'}
                    />
                </div>

                {/* Search Bar */}
                {!collapsed ? (
                    <div className="relative mb-6">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                        <input
                            type="text"
                            placeholder="Search..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            ref={searchInputRef}
                            className="w-full bg-white/10 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/20 transition-all placeholder:text-white/40"
                        />
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/5 border border-white/10 rounded-md px-1.5 py-0.5 text-[10px] text-white/40 font-mono">
                            ⌘K
                        </div>
                    </div>
                ) : (
                    <button
                        type="button"
                        title="Search"
                        onClick={onToggleCollapse}
                        className="w-full mb-4 flex items-center justify-center rounded-xl py-2.5 text-white/70 hover:bg-white/10 hover:text-white transition-colors"
                    >
                        <Search className="w-5 h-5" />
                    </button>
                )}

                {/* Book a session CTA (student only) */}
                {effectiveRole === 'student' && (
                    <button
                        type="button"
                        title="Book a session"
                        onClick={() => {
                            if (typeof window !== 'undefined') {
                                window.dispatchEvent(new CustomEvent('open-book-session'))
                            }
                        }}
                        className={cn(
                            'mb-2 inline-flex items-center justify-center rounded-2xl bg-white text-accent font-semibold shadow-md shadow-black/20 hover:bg-amber-100 hover:text-accent transition-colors',
                            collapsed ? 'w-full p-2.5' : 'w-full gap-2 text-sm py-2.5'
                        )}
                    >
                        <Calendar className="w-4 h-4 shrink-0" />
                        {!collapsed && <span>Book a session</span>}
                    </button>
                )}

            </div>

            {/* Navigation Section - separate scroll, no chaining to main */}
            <nav className={cn('grow min-h-0 py-2 space-y-1 overflow-y-auto overscroll-contain custom-scrollbar', collapsed ? 'px-1.5' : 'px-3')}>
                {filteredMenuItems.map((item) => {
                    const isActive = pathname === item.href
                    const showReportsBadge = item.name === 'Reports' && effectiveRole === 'mentor' && pendingReportsCount > 0
                    const showRequestsBadge = item.name === 'Requests' && effectiveRole === 'mentor' && pendingRequestsCount > 0
                    const showTrainingIncompleteBadge = item.name === 'Training' && effectiveRole === 'mentor' && onboardingIncomplete && !trainingComplete
                    const showTrainingCompleteBadge = item.name === 'Training' && effectiveRole === 'mentor' && !!trainingComplete
                    const showStudentHelpBadge = item.name === 'Student Help' && (effectiveRole === 'admin' || effectiveRole === 'admin-dev') && studentHelpCount > 0
                    const showMessagesUnreadBadge =
                        item.name === 'Messages' &&
                        (effectiveRole === 'student' || effectiveRole === 'mentor') &&
                        unreadMessagesCount > 0
                    const hasBadge =
                        showReportsBadge ||
                        showRequestsBadge ||
                        showTrainingIncompleteBadge ||
                        showTrainingCompleteBadge ||
                        showStudentHelpBadge ||
                        showMessagesUnreadBadge

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            title={collapsed ? item.name : undefined}
                            draggable={dndEnabled}
                            onDragStart={dndEnabled ? () => { dragNameRef.current = item.name; setDraggingName(item.name) } : undefined}
                            onDragEnd={dndEnabled ? () => { dragNameRef.current = null; setDraggingName(null); setDragOverName(null) } : undefined}
                            onDragOver={dndEnabled ? (e) => { e.preventDefault(); if (dragOverName !== item.name) setDragOverName(item.name) } : undefined}
                            onDragLeave={dndEnabled ? () => { if (dragOverName === item.name) setDragOverName(null) } : undefined}
                            onDrop={dndEnabled ? (e) => { e.preventDefault(); handleNavDrop(item.name) } : undefined}
                            className={cn(
                                'flex items-center rounded-xl transition-all group relative',
                                collapsed ? 'justify-center p-2.5' : 'justify-between px-3 py-2.5',
                                isActive
                                    ? 'bg-white/15 text-white shadow-sm'
                                    : 'text-white/70 hover:bg-white/10 hover:text-white',
                                dndEnabled && 'cursor-grab active:cursor-grabbing',
                                draggingName === item.name && 'opacity-40',
                                dragOverName === item.name && draggingName !== item.name && 'ring-2 ring-white/40'
                            )}
                        >
                            <div className={cn('flex items-center', !collapsed && 'gap-3')}>
                                <item.icon className={`w-5 h-5 transition-colors ${isActive ? 'text-white' : 'text-white/40 group-hover:text-white/70'}`} />
                                {!collapsed && <span className="font-medium text-sm">{item.name}</span>}
                            </div>
                            {collapsed && hasBadge && (
                                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
                            )}
                            {!collapsed && showReportsBadge && (
                                <span className="px-1.5 py-0.5 bg-amber-500 text-white text-xs font-bold rounded-full min-w-[20px] text-center">
                                    {pendingReportsCount}
                                </span>
                            )}
                            {!collapsed && showRequestsBadge && (
                                <span className="px-1.5 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] text-center">
                                    {pendingRequestsCount > 9 ? '9+' : pendingRequestsCount}
                                </span>
                            )}
                            {!collapsed && showTrainingIncompleteBadge && (
                                <span className="px-1.5 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                                    <AlertCircle className="w-3 h-3" />
                                </span>
                            )}
                            {!collapsed && showTrainingCompleteBadge && (
                                <span className="px-1.5 py-0.5 bg-green-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                                    <CheckCircle className="w-3 h-3" />
                                </span>
                            )}
                            {!collapsed && showStudentHelpBadge && (
                                <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse shadow-sm shadow-red-500/50" />
                            )}
                            {!collapsed && showMessagesUnreadBadge && (
                                <span className="px-1.5 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] text-center">
                                    {unreadMessagesCount > 9 ? '9+' : unreadMessagesCount}
                                </span>
                            )}
                        </Link>
                    )
                })}

                {/* Expandable Sections (only for student) */}
                {effectiveRole === 'student' && filteredStudentSections.map((section) => {
                    const isExpanded = expandedSections.includes(section.name) || searchQuery !== ''
                    const isAnySectionActive = section.subsections.some(sub => pathname === sub.href)

                    if (collapsed) {
                        return (
                            <Link
                                key={section.name}
                                href={section.subsections[0].href}
                                title={section.name}
                                className={cn(
                                    'flex items-center justify-center p-2.5 rounded-xl transition-all group',
                                    isAnySectionActive
                                        ? 'bg-white/15 text-white shadow-sm'
                                        : 'text-white/70 hover:bg-white/10 hover:text-white'
                                )}
                            >
                                <section.icon className={`w-5 h-5 transition-colors ${isAnySectionActive ? 'text-white' : 'text-white/40 group-hover:text-white/70'}`} />
                            </Link>
                        )
                    }

                    return (
                        <div key={section.name} className="pt-2">
                            <button
                                onClick={() => {
                                    setExpandedSections(prev =>
                                        prev.includes(section.name)
                                            ? prev.filter(s => s !== section.name)
                                            : [...prev, section.name]
                                    )
                                }}
                                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all group ${isAnySectionActive
                                    ? 'bg-white/15 text-white shadow-sm'
                                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    <section.icon className={`w-5 h-5 transition-colors ${isAnySectionActive ? 'text-white' : 'text-white/40 group-hover:text-white/70'}`} />
                                    <span className="font-medium text-sm">{section.name}</span>
                                </div>
                                <ChevronDown
                                    className={`w-4 h-4 text-white/40 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                                />
                            </button>

                            {/* Subsections */}
                            <div className={`overflow-hidden transition-all duration-200 ${isExpanded ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'}`}>
                                <div className="pl-4 pt-1 space-y-0.5">
                                    {section.subsections.map((sub) => {
                                        const isSubActive = pathname === sub.href
                                        return (
                                            <Link
                                                key={sub.href}
                                                href={sub.href}
                                                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all group ${isSubActive
                                                    ? 'bg-white/10 text-white'
                                                    : 'text-white/60 hover:bg-white/5 hover:text-white'
                                                    }`}
                                            >
                                                <sub.icon className={`w-4 h-4 transition-colors ${isSubActive ? 'text-white' : 'text-white/40 group-hover:text-white/60'}`} />
                                                <span className="font-medium text-sm">{sub.name}</span>
                                            </Link>
                                        )
                                    })}
                                </div>
                            </div>
                        </div>
                    )
                })}

                {filteredMenuItems.length === 0 && filteredStudentSections.length === 0 && !collapsed && (
                    <div className="px-4 py-8 text-center">
                        <p className="text-white/40 text-sm">No results found</p>
                    </div>
                )}
            </nav>

            {/* Footer Section */}
            <div className={cn('border-t border-white/10 bg-black/10', collapsed ? 'p-1.5' : 'p-3')}>
                {effectiveRole === 'student' ? (
                    <div className="relative" ref={profileMenuRef}>
                        {/* Drop-up menu (above profile button) – connected */}
                        <div
                            className={cn(
                                'absolute overflow-hidden border border-white/10 bg-accent shadow-lg transition-all duration-200 ease-out z-50',
                                collapsed
                                    ? 'bottom-0 left-full ml-2 w-48 rounded-2xl'
                                    : 'bottom-full left-0 right-0 rounded-t-2xl border-b-0',
                                profileMenuOpen
                                    ? 'opacity-100 translate-y-0 visible'
                                    : collapsed
                                      ? 'opacity-0 -translate-x-2 pointer-events-none invisible'
                                      : 'opacity-0 translate-y-2 pointer-events-none invisible'
                            )}
                        >
                            <Link
                                href="/dashboard/student/profile"
                                onClick={() => setProfileMenuOpen(false)}
                                className="flex items-center gap-3 px-3 py-2.5 text-white/80 hover:bg-white/10 hover:text-white transition-all text-sm border-b border-white/10"
                            >
                                <User className="w-5 h-5 text-white/60" />
                                <span>My Profile</span>
                            </Link>
                            <Link
                                href="/dashboard/settings"
                                onClick={() => setProfileMenuOpen(false)}
                                className="flex items-center gap-3 px-3 py-2.5 text-white/80 hover:bg-white/10 hover:text-white transition-all text-sm border-b border-white/10"
                            >
                                <Settings className="w-5 h-5 text-white/60" />
                                <span>Settings</span>
                            </Link>
                            <button
                                type="button"
                                onClick={() => {
                                    setProfileMenuOpen(false)
                                    handleSignOut()
                                }}
                                className="w-full flex items-center gap-3 px-3 py-2.5 text-white/80 hover:bg-red-500/10 hover:text-red-400 transition-all text-sm group"
                            >
                                <LogOut className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                                <span>Sign Out</span>
                            </button>
                        </div>

                        {/* Profile button – opens drop-up, connects visually when menu open */}
                        <button
                            type="button"
                            title={userName || 'Profile'}
                            onClick={() => setProfileMenuOpen((open) => !open)}
                            className={cn(
                                'w-full flex items-center bg-white/5 border border-white/5 group cursor-pointer hover:bg-white/10 hover:border-white/10 transition-all',
                                collapsed
                                    ? 'justify-center p-2 rounded-xl'
                                    : `justify-between py-3 px-3 rounded-b-2xl ${profileMenuOpen ? 'rounded-t-none' : 'rounded-2xl'}`
                            )}
                        >
                            <div className={cn('flex items-center min-w-0', !collapsed && 'gap-3')}>
                                <div className="w-9 h-9 rounded-xl bg-white/10 text-white flex items-center justify-center text-sm font-bold shrink-0 border border-white/10 overflow-hidden">
                                    {photoUrl ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={photoUrl} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        userName?.[0] || 'U'
                                    )}
                                </div>
                                {!collapsed && (
                                    <div className="flex flex-col min-w-0 text-left">
                                        <span className="text-sm font-semibold text-white truncate">{userName || 'User'}</span>
                                        <span className="text-[10px] text-white/40 uppercase tracking-wider font-medium truncate">{role}</span>
                                    </div>
                                )}
                            </div>
                            {!collapsed && (
                                <ChevronUp
                                    className={`w-4 h-4 text-white/40 shrink-0 transition-transform duration-200 ${profileMenuOpen ? 'rotate-180' : ''}`}
                                />
                            )}
                        </button>
                    </div>
                ) : (
                    <>
                        <div
                            className={cn(
                                'flex items-center bg-white/5 border border-white/5 rounded-2xl group hover:bg-white/10 hover:border-white/10 transition-all',
                                collapsed ? 'justify-center p-2' : 'justify-between py-3 px-3'
                            )}
                            title={userName || 'Profile'}
                        >
                            <div className={cn('flex items-center min-w-0', !collapsed && 'gap-3')}>
                                <div className="w-9 h-9 rounded-xl bg-white/10 text-white flex items-center justify-center text-sm font-bold shrink-0 border border-white/10 overflow-hidden">
                                    {photoUrl ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={photoUrl} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        userName?.[0] || 'U'
                                    )}
                                </div>
                                {!collapsed && (
                                    <div className="flex flex-col min-w-0">
                                        <span className="text-sm font-semibold text-white truncate">{userName || 'User'}</span>
                                        <span className="text-[10px] text-white/40 uppercase tracking-wider font-medium truncate">{role}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <Link
                            href="/dashboard/settings"
                            title="Settings"
                            className={cn(
                                'mt-2 w-full flex items-center rounded-xl text-white/50 hover:bg-white/10 hover:text-white transition-all text-sm group',
                                collapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-2.5'
                            )}
                        >
                            <Settings className="w-5 h-5 text-white/40 group-hover:text-white/70 transition-colors shrink-0" />
                            {!collapsed && <span>Settings</span>}
                        </Link>

                        <button
                            type="button"
                            title="Sign Out"
                            onClick={handleSignOut}
                            className={cn(
                                'mt-1 w-full flex items-center rounded-xl text-white/50 hover:bg-red-500/10 hover:text-red-400 transition-all text-sm group',
                                collapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-2.5'
                            )}
                        >
                            <LogOut className="w-5 h-5 transition-transform group-hover:translate-x-1 shrink-0" />
                            {!collapsed && <span>Sign Out</span>}
                        </button>
                    </>
                )}
            </div>
        </aside>
    )
}
