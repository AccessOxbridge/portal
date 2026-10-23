'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
    CalendarBlank as Calendar,
    Gear as Settings,
    SignOut as LogOut,
    MagnifyingGlass as Search,
    CheckCircle,
    CaretDown as ChevronDown,
    SidebarSimple,
    CaretUpDown,
    WarningCircle as AlertCircle,
    User,
} from '@phosphor-icons/react/ssr'
import { createClient } from '@/utils/supabase/client'
import { cn } from '@/utils/lib'
import { Logo } from '../logo'
import { navigation, studentSections } from './nav-items'
import { version as appVersion } from '@/package.json'
import { useUnreadMessages } from './use-unread-messages'
import { Avatar } from '@/components/ui/avatar'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/overlay'

interface SidebarProps {
    role: string;
    userName: string;
    userEmail?: string;
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
    userEmail,
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

    // The profile menu (student only) is a Radix DropdownMenu: it closes on an
    // outside click or Escape by itself and returns focus to its button.

    // Base nav items for the current role, reordered to match the saved custom order.
    // Items not present in the saved order (newly added or renamed tabs) go back to
    // their default position, so a renamed first tab stays first.
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
        for (const item of remaining.values()) {
            ordered.splice(Math.min(baseItems.indexOf(item), ordered.length), 0, item)
        }
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

    // Nav row shared by role items and student sections. Active rows get the
    // filled icon (Phosphor fill marks the active state, better-ui).
    const rowBase = cn(
        'group relative flex items-center rounded-control outline-none',
        'transition-[background-color,color] duration-150 ease-out',
        'focus-visible:ring-2 focus-visible:ring-sidebar-ring',
    )
    const rowState = (active: boolean) =>
        active
            ? 'bg-sidebar-active text-white'
            : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-white'

    const countPill = 'inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold tabular-nums'

    return (
        <aside
            className={cn(
                // Hidden below `md`: phones get MobileTopBar + MobileTabBar instead.
                'bg-sidebar hidden md:flex flex-col h-screen fixed left-0 top-0 z-50 transition-[width] duration-200 ease-snappy motion-reduce:transition-none',
                collapsed ? 'w-[4.5rem]' : 'w-64'
            )}
        >
            {/* Top: brand and the collapse toggle (the CRM's panel button), then
                search and the student's main action */}
            <div className="px-3 pb-3">
                <div className={cn('flex', collapsed ? 'flex-col items-center gap-1 pt-4 pb-3' : 'h-16 items-center justify-between gap-2 pl-1 mb-1')}>
                    <Logo
                        size="sidebar"
                        iconOnly={collapsed}
                        textColor="text-white"
                        className="justify-start"
                    />
                    {onToggleCollapse && (
                        <button
                            type="button"
                            onClick={onToggleCollapse}
                            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                            aria-pressed={collapsed}
                            className={cn(rowBase, rowState(false), 'shrink-0 justify-center', collapsed ? 'h-10 w-full' : 'size-8')}
                        >
                            <SidebarSimple className="size-5 text-white/60 group-hover:text-white" />
                        </button>
                    )}
                </div>

                {!collapsed ? (
                    <div className="relative mb-4">
                        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/50" />
                        <input
                            type="text"
                            placeholder="Search..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            ref={searchInputRef}
                            className={cn(
                                'h-10 w-full rounded-control border border-white/10 bg-white/[0.07] pl-9 pr-12 text-sm text-white outline-none',
                                'placeholder:text-white/50 transition-[background-color,border-color] duration-150',
                                'focus:border-white/25 focus:bg-white/[0.11]'
                            )}
                        />
                        <kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded-[6px] border border-white/10 px-1.5 py-0.5 font-sans text-[11px] text-white/50">
                            ⌘K
                        </kbd>
                    </div>
                ) : (
                    <button
                        type="button"
                        title="Search"
                        onClick={onToggleCollapse}
                        className={cn(rowBase, rowState(false), 'mb-3 h-10 w-full justify-center')}
                    >
                        <Search className="size-5" />
                    </button>
                )}

                {/* Book a session (student only) */}
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
                            'inline-flex w-full items-center justify-center rounded-full bg-white font-medium text-primary outline-none',
                            'transition-[background-color,scale] duration-150 ease-out hover:bg-white/90 active:scale-[0.96]',
                            'focus-visible:ring-2 focus-visible:ring-sidebar-ring',
                            collapsed ? 'h-10' : 'h-10 gap-2 text-sm'
                        )}
                    >
                        <Calendar weight="bold" className="size-4 shrink-0" />
                        {!collapsed && <span>Book a session</span>}
                    </button>
                )}
            </div>

            {/* Navigation: its own scroll, never chained to the page */}
            <nav className={cn('custom-scrollbar grow min-h-0 space-y-0.5 overflow-y-auto overscroll-contain py-2', collapsed ? 'px-3' : 'px-3')}>
                {filteredMenuItems.map((item) => {
                    const isActive = pathname === item.href
                    const showReportsBadge = item.name === 'Reports' && effectiveRole === 'mentor' && pendingReportsCount > 0
                    const showRequestsBadge = item.name === 'Requests' && effectiveRole === 'mentor' && pendingRequestsCount > 0
                    const showTrainingIncompleteBadge = item.name === 'Training' && effectiveRole === 'mentor' && onboardingIncomplete && !trainingComplete
                    const showTrainingCompleteBadge = item.name === 'Training' && effectiveRole === 'mentor' && !!trainingComplete
                    const showStudentHelpBadge = item.name === 'Student Help' && (effectiveRole === 'admin' || effectiveRole === 'admin-dev') && studentHelpCount > 0
                    const showMessagesUnreadBadge =
                        item.name === 'Messages' &&
                        (effectiveRole === 'student' ||
                            effectiveRole === 'mentor' ||
                            effectiveRole === 'admin' ||
                            effectiveRole === 'admin-dev') &&
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
                            aria-current={isActive ? 'page' : undefined}
                            draggable={dndEnabled}
                            onDragStart={dndEnabled ? () => { dragNameRef.current = item.name; setDraggingName(item.name) } : undefined}
                            onDragEnd={dndEnabled ? () => { dragNameRef.current = null; setDraggingName(null); setDragOverName(null) } : undefined}
                            onDragOver={dndEnabled ? (e) => { e.preventDefault(); if (dragOverName !== item.name) setDragOverName(item.name) } : undefined}
                            onDragLeave={dndEnabled ? () => { if (dragOverName === item.name) setDragOverName(null) } : undefined}
                            onDrop={dndEnabled ? (e) => { e.preventDefault(); handleNavDrop(item.name) } : undefined}
                            className={cn(
                                rowBase,
                                rowState(isActive),
                                collapsed ? 'h-10 justify-center' : 'h-10 justify-between gap-3 px-3 in-data-[density=compact]:h-9',
                                dndEnabled && 'cursor-grab active:cursor-grabbing',
                                draggingName === item.name && 'opacity-40',
                                dragOverName === item.name && draggingName !== item.name && 'ring-2 ring-white/40'
                            )}
                        >
                            <span className={cn('flex min-w-0 items-center', !collapsed && 'gap-3')}>
                                <item.icon
                                    weight={isActive ? 'fill' : 'regular'}
                                    className={cn('size-5 shrink-0', isActive ? 'text-white' : 'text-white/60 group-hover:text-white')}
                                />
                                {!collapsed && <span className="truncate text-[15px] font-medium in-data-[density=compact]:text-sm">{item.name}</span>}
                            </span>
                            {collapsed && hasBadge && (
                                <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-[#f87171] ring-2 ring-sidebar" />
                            )}
                            {!collapsed && showReportsBadge && (
                                <span className={cn(countPill, 'bg-[#fbbf24] text-[#422006]')}>{pendingReportsCount}</span>
                            )}
                            {!collapsed && showRequestsBadge && (
                                <span className={cn(countPill, 'bg-[#f87171] text-white')}>
                                    {pendingRequestsCount > 9 ? '9+' : pendingRequestsCount}
                                </span>
                            )}
                            {!collapsed && showTrainingIncompleteBadge && (
                                <span className={cn(countPill, 'bg-[#f87171] px-1 text-white')} title="Training not finished">
                                    <AlertCircle weight="bold" className="size-3.5" />
                                </span>
                            )}
                            {!collapsed && showTrainingCompleteBadge && (
                                <span className={cn(countPill, 'bg-[#34d399] px-1 text-[#022c22]')} title="Training complete">
                                    <CheckCircle weight="bold" className="size-3.5" />
                                </span>
                            )}
                            {!collapsed && showStudentHelpBadge && (
                                <span className="size-2.5 rounded-full bg-[#f87171]" title="Students waiting for help" />
                            )}
                            {!collapsed && showMessagesUnreadBadge && (
                                <span className={cn(countPill, 'bg-[#f87171] text-white')}>
                                    {unreadMessagesCount > 9 ? '9+' : unreadMessagesCount}
                                </span>
                            )}
                        </Link>
                    )
                })}

                {/* Expandable sections (student only) */}
                {effectiveRole === 'student' && filteredStudentSections.map((section) => {
                    const isExpanded = expandedSections.includes(section.name) || searchQuery !== ''
                    const isAnySectionActive = section.subsections.some(sub => pathname === sub.href)

                    if (collapsed) {
                        return (
                            <Link
                                key={section.name}
                                href={section.subsections[0].href}
                                title={section.name}
                                className={cn(rowBase, rowState(isAnySectionActive), 'h-10 justify-center')}
                            >
                                <section.icon weight={isAnySectionActive ? 'fill' : 'regular'} className="size-5" />
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
                                className={cn(rowBase, rowState(isAnySectionActive), 'h-10 w-full justify-between px-3')}
                            >
                                <span className="flex items-center gap-3">
                                    <section.icon weight={isAnySectionActive ? 'fill' : 'regular'} className="size-5" />
                                    <span className="text-[15px] font-medium">{section.name}</span>
                                </span>
                                <ChevronDown
                                    className={cn('size-4 text-white/50 transition-[rotate] duration-200 ease-snappy', isExpanded && 'rotate-180')}
                                />
                            </button>

                            <div className={cn('grid transition-[grid-template-rows,opacity] duration-200 ease-snappy', isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0')}>
                                <div className="overflow-hidden">
                                    <div className="space-y-0.5 pt-1 pl-4">
                                        {section.subsections.map((sub) => {
                                            const isSubActive = pathname === sub.href
                                            return (
                                                <Link
                                                    key={sub.href}
                                                    href={sub.href}
                                                    className={cn(rowBase, rowState(isSubActive), 'h-9 gap-3 px-3')}
                                                >
                                                    <sub.icon weight={isSubActive ? 'fill' : 'regular'} className="size-4" />
                                                    <span className="text-sm font-medium">{sub.name}</span>
                                                </Link>
                                            )
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                })}

                {filteredMenuItems.length === 0 && filteredStudentSections.length === 0 && !collapsed && (
                    <div className="px-4 py-8 text-center">
                        <p className="text-sm text-white/60">No results found</p>
                    </div>
                )}
            </nav>

            {/* Footer: who's signed in, settings and sign out */}
            <div className={cn('border-t border-sidebar-border', collapsed ? 'p-2' : 'p-3')}>
                {effectiveRole === 'student' ? (
                    <DropdownMenu open={profileMenuOpen} onOpenChange={setProfileMenuOpen}>
                        <DropdownMenuTrigger asChild>
                            <button
                                type="button"
                                title={userName || 'Profile'}
                                className={cn(
                                    rowBase,
                                    'w-full text-left hover:bg-sidebar-accent',
                                    profileMenuOpen && 'bg-sidebar-accent',
                                    collapsed ? 'justify-center p-1.5' : 'justify-between gap-3 p-2'
                                )}
                            >
                                <span className={cn('flex min-w-0 items-center', !collapsed && 'gap-3')}>
                                    <Avatar name={userName || 'User'} src={photoUrl} size="md" />
                                    {!collapsed && (
                                        <span className="flex min-w-0 flex-col">
                                            <span className="truncate text-sm font-medium text-white">{userName || 'User'}</span>
                                            <span className="truncate text-xs capitalize text-white/60">{role}</span>
                                        </span>
                                    )}
                                </span>
                                {!collapsed && <CaretUpDown className="size-4 shrink-0 text-white/50" />}
                            </button>
                        </DropdownMenuTrigger>
                        {/* Opens beside the sidebar (shadcn's sidebar pattern), lined up
                            with the bottom of the button, so it never covers the nav. */}
                        <DropdownMenuContent side="right" align="end" sideOffset={12} className="w-max min-w-60 max-w-80">
                            {/* Grows to fit (up to 320px), then wraps: a long name or
                                email is never cut off. */}
                            <div className="flex items-center gap-2.5 px-2 py-2">
                                <Avatar name={userName || 'User'} src={photoUrl} size="sm" />
                                <div className="min-w-0 leading-tight">
                                    <p className="text-sm font-medium text-foreground [overflow-wrap:anywhere]">{userName || 'User'}</p>
                                    {userEmail && <p className="mt-0.5 text-xs text-muted-foreground [overflow-wrap:anywhere]">{userEmail}</p>}
                                </div>
                            </div>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem asChild>
                                <Link href="/dashboard/student/profile">
                                    <User />
                                    <span>My profile</span>
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                                <Link href="/dashboard/settings">
                                    <Settings />
                                    <span>Settings</span>
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem variant="destructive" onSelect={() => handleSignOut()}>
                                <LogOut />
                                <span>Sign out</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                ) : (
                    <>
                        <div
                            className={cn('flex items-center rounded-control', collapsed ? 'justify-center p-1.5' : 'gap-3 p-2')}
                            title={userName || 'Profile'}
                        >
                            <Avatar name={userName || 'User'} src={photoUrl} size="md" />
                            {!collapsed && (
                                <span className="flex min-w-0 flex-col">
                                    <span className="truncate text-sm font-medium text-white">{userName || 'User'}</span>
                                    <span className="truncate text-xs capitalize text-white/60">{role}</span>
                                </span>
                            )}
                        </div>

                        <Link
                            href="/dashboard/settings"
                            title="Settings"
                            className={cn(rowBase, rowState(pathname === '/dashboard/settings'), 'mt-1 h-9 w-full text-sm', collapsed ? 'justify-center' : 'gap-3 px-3')}
                        >
                            <Settings className="size-5 shrink-0" />
                            {!collapsed && <span>Settings</span>}
                        </Link>

                        <button
                            type="button"
                            title="Sign out"
                            onClick={handleSignOut}
                            className={cn(rowBase, 'mt-0.5 h-9 w-full text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-white', collapsed ? 'justify-center' : 'gap-3 px-3')}
                        >
                            <LogOut className="size-5 shrink-0" />
                            {!collapsed && <span>Sign out</span>}
                        </button>
                    </>
                )}

                {!collapsed && (
                    <p className="mt-3 text-center text-[11px] text-white/50">
                        Access Oxbridge Portal <span className="font-mono tabular-nums">v{appVersion}</span>
                    </p>
                )}
            </div>
        </aside>
    )
}
