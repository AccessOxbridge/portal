'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
    LayoutDashboard,
    Users,
    Calendar,
    Settings,
    LogOut,
    Search,
    CreditCard,
    FileText,
    CheckCircle,
    PenBoxIcon,
    Coins,
    Banknote,
    MessageSquare,
    MessageCircle,
    Book,
    BookOpen,
    CalendarDays,
    Video,
    MapPin,
    ChevronDown,
    Home,
    Briefcase,
    GraduationCap,
    AlertCircle,
    HelpCircle
} from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { Logo } from '../logo'
import NotificationBell from './notification-bell'

interface SidebarProps {
    role: string;
    userName: string;
    userId?: string;
    pendingReportsCount?: number;
    onboardingIncomplete?: boolean;
    studentHelpCount?: number;
}

// Define section type for expandable sections
interface NavSection {
    name: string;
    icon: React.ElementType;
    subsections: { name: string; href: string; icon: React.ElementType }[];
}

const studentSections: NavSection[] = [
    {
        name: 'Events',
        icon: CalendarDays,
        subsections: [
            { name: 'Webinars', href: '/dashboard/student/events/webinars', icon: Video },
            { name: 'In Person Events', href: '/dashboard/student/events/in-person', icon: MapPin },
        ],
    },
]

const navigation = {
    student: [
        { name: 'Home', href: '/dashboard/student', icon: Home },
        { name: 'Services', href: '/dashboard/student/services', icon: CreditCard },
        { name: 'My Sessions', href: '/dashboard/student/sessions', icon: Calendar },
        { name: 'Messages', href: '/dashboard/student/messages', icon: MessageCircle },
        { name: 'My Mentors', href: '/dashboard/student/mentors', icon: Users },
        { name: 'Reports', href: '/dashboard/student/reports', icon: FileText },
        { name: 'Resources', href: '/dashboard/student/resources', icon: Book },
    ],
    mentor: [
        { name: 'Training', href: '/dashboard/mentor/training', icon: GraduationCap },
        { name: 'Dashboard', href: '/dashboard/mentor', icon: LayoutDashboard },
        { name: 'Messages', href: '/dashboard/mentor/messages', icon: MessageCircle },
        { name: 'Sessions', href: '/dashboard/mentor/sessions', icon: Calendar },
        { name: 'Reports', href: '/dashboard/mentor/reports', icon: FileText },
        { name: 'Payouts', href: '/dashboard/mentor/payouts', icon: Banknote },
        { name: 'Availability', href: '/dashboard/mentor/availability', icon: CheckCircle },
    ],
    admin: [
        { name: 'Overview', href: '/dashboard/admin', icon: LayoutDashboard },
        { name: 'Approvals', href: '/dashboard/admin/approvals', icon: CheckCircle },
        { name: 'Mentors', href: '/dashboard/admin/mentors', icon: Users },
        { name: 'Students', href: '/dashboard/admin/students', icon: BookOpen },
        { name: 'Student Help', href: '/dashboard/admin/student-help', icon: HelpCircle },
        { name: 'Events', href: '/dashboard/admin/events', icon: CalendarDays },
        { name: 'Products', href: '/dashboard/admin/products', icon: Coins },
        { name: 'Feedback', href: '/dashboard/admin/feedbacks', icon: MessageSquare },
        { name: 'Messages', href: '/dashboard/admin/messages', icon: MessageCircle },
        { name: 'Blog', href: '/dashboard/admin/blog', icon: PenBoxIcon },
        { name: 'Reports', href: '/dashboard/admin/reports', icon: FileText },
        { name: 'Transactions', href: '/dashboard/admin/transactions', icon: CreditCard },
        { name: 'Payouts', href: '/dashboard/admin/payouts', icon: Banknote },
        { name: 'Issues', href: '/dashboard/admin/issues', icon: AlertCircle },
        { name: 'Legal', href: '/dashboard/admin/legal', icon: Briefcase },
    ],
    'admin-dev': [ // Same as admin for now
        { name: 'Overview', href: '/dashboard/admin', icon: LayoutDashboard },
        { name: 'Approvals', href: '/dashboard/admin/approvals', icon: CheckCircle },
        { name: 'Mentors', href: '/dashboard/admin/mentors', icon: Users },
        { name: 'Students', href: '/dashboard/admin/students', icon: BookOpen },
        { name: 'Student Help', href: '/dashboard/admin/student-help', icon: HelpCircle },
        { name: 'Events', href: '/dashboard/admin/events', icon: CalendarDays },
        { name: 'Products', href: '/dashboard/admin/products', icon: Coins },
        { name: 'Feedback', href: '/dashboard/admin/feedbacks', icon: MessageSquare },
        { name: 'Messages', href: '/dashboard/admin/messages', icon: MessageCircle },
        { name: 'Blog', href: '/dashboard/admin/blog', icon: PenBoxIcon },
        { name: 'Reports', href: '/dashboard/admin/reports', icon: FileText },
        { name: 'Transactions', href: '/dashboard/admin/transactions', icon: CreditCard },
        { name: 'Payouts', href: '/dashboard/admin/payouts', icon: Banknote },
        { name: 'Issues', href: '/dashboard/admin/issues', icon: AlertCircle },
        { name: 'Legal', href: '/dashboard/admin/legal', icon: Briefcase },
    ]
}

export default function Sidebar({ role, userName, userId, pendingReportsCount = 0, onboardingIncomplete = false, studentHelpCount = 0 }: SidebarProps) {
    const pathname = usePathname()
    const supabase = createClient()
    const [expandedSections, setExpandedSections] = useState<string[]>(['Events'])
    const [searchQuery, setSearchQuery] = useState('')
    const searchInputRef = useRef<HTMLInputElement>(null)

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
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [])

    // Determine effective role for admin-dev to show relevant sidebar on different dashboard pages
    let effectiveRole = role
    if (role === 'admin-dev') {
        if (pathname.startsWith('/dashboard/student')) effectiveRole = 'student'
        else if (pathname.startsWith('/dashboard/mentor')) effectiveRole = 'mentor'
        else if (pathname.startsWith('/dashboard/admin')) effectiveRole = 'admin-dev'
    }

    // Filter menu items based on search query
    const filteredMenuItems = useMemo(() => {
        const items = navigation[effectiveRole as keyof typeof navigation] || navigation.student
        if (!searchQuery) return items
        return items.filter(item =>
            item.name.toLowerCase().includes(searchQuery.toLowerCase())
        )
    }, [effectiveRole, searchQuery])

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
        <aside className="w-64 bg-accent border-r border-white/10 flex flex-col h-screen fixed left-0 top-0 z-50">
            {/* Top Branding & Search */}
            <div className="p-6 pb-2">
                <div className="flex items-center justify-between mb-8">
                    <Logo className="h-8" textColor="text-white" />
                </div>

                {/* Search Bar */}
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
            </div>

            {/* Navigation Section */}
            <nav className="grow px-3 py-2 space-y-1 overflow-y-auto custom-scrollbar">
                {filteredMenuItems.map((item) => {
                    const isActive = pathname === item.href
                    const showReportsBadge = item.name === 'Reports' && effectiveRole === 'mentor' && pendingReportsCount > 0
                    const showTrainingBadge = item.name === 'Training' && effectiveRole === 'mentor' && onboardingIncomplete
                    const showStudentHelpBadge = item.name === 'Student Help' && (effectiveRole === 'admin' || effectiveRole === 'admin-dev') && studentHelpCount > 0

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-center justify-between px-3 py-2.5 rounded-xl transition-all group ${isActive
                                ? 'bg-white/15 text-white shadow-sm'
                                : 'text-white/70 hover:bg-white/10 hover:text-white'
                                }`}
                        >
                            <div className="flex items-center gap-3">
                                <item.icon className={`w-5 h-5 transition-colors ${isActive ? 'text-white' : 'text-white/40 group-hover:text-white/70'}`} />
                                <span className="font-medium text-sm">{item.name}</span>
                            </div>
                            {showReportsBadge && (
                                <span className="px-1.5 py-0.5 bg-amber-500 text-white text-xs font-bold rounded-full min-w-[20px] text-center">
                                    {pendingReportsCount}
                                </span>
                            )}
                            {showTrainingBadge && (
                                <span className="px-1.5 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                                    <AlertCircle className="w-3 h-3" />
                                </span>
                            )}
                            {showStudentHelpBadge && (
                                <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse shadow-sm shadow-red-500/50" />
                            )}
                        </Link>
                    )
                })}

                {/* Expandable Sections (only for student) */}
                {effectiveRole === 'student' && filteredStudentSections.map((section) => {
                    const isExpanded = expandedSections.includes(section.name) || searchQuery !== ''
                    const isAnySectionActive = section.subsections.some(sub => pathname === sub.href)

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

                {filteredMenuItems.length === 0 && filteredStudentSections.length === 0 && (
                    <div className="px-4 py-8 text-center">
                        <p className="text-white/40 text-sm">No results found</p>
                    </div>
                )}
            </nav>

            {/* Footer Section */}
            <div className="p-3 border-t border-white/10 bg-black/10">
                <div className="flex items-center justify-between py-3 px-3 bg-white/5 border border-white/5 rounded-2xl group cursor-pointer hover:bg-white/10 hover:border-white/10 transition-all">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-white/10 text-white flex items-center justify-center text-sm font-bold shrink-0 border border-white/10">
                            {userName?.[0] || 'U'}
                        </div>
                        <div className="flex flex-col min-w-0">
                            <span className="text-sm font-semibold text-white truncate">{userName || 'User'}</span>
                            <span className="text-[10px] text-white/40 uppercase tracking-wider font-medium truncate">{role}</span>
                        </div>
                    </div>
                </div>

                <button
                    onClick={handleSignOut}
                    className="mt-2 w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/50 hover:bg-red-500/10 hover:text-red-400 transition-all text-sm group"
                >
                    <LogOut className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                    <span>Sign Out</span>
                </button>
            </div>
        </aside>
    )
}
