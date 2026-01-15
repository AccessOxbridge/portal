'use client'

import { useState } from 'react'
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
    MessageSquare,
    MessageCircle,
    Book,
    CalendarDays,
    Video,
    MapPin,
    ChevronDown
} from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { Logo } from '../logo'
import NotificationBell from './notification-bell'
import AcademicProfileCard from './academic-profile-card'

interface SidebarProps {
    role: string;
    userName: string;
    userId?: string;
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
        { name: 'Explore', href: '/dashboard/student', icon: Search },
        { name: 'Credits', href: '/dashboard/student/credits', icon: CreditCard },
        { name: 'My Sessions', href: '/dashboard/student/sessions', icon: Calendar },
        { name: 'Messages', href: '/dashboard/student/messages', icon: MessageCircle },
        { name: 'My Mentors', href: '/dashboard/student/mentors', icon: Users },
        { name: 'Reports', href: '/dashboard/student/reports', icon: FileText },
        { name: 'Resources', href: '/dashboard/student/resources', icon: Book },
        { name: 'Settings', href: '/dashboard/settings', icon: Settings },
    ],
    mentor: [
        { name: 'Dashboard', href: '/dashboard/mentor', icon: LayoutDashboard },
        { name: 'Messages', href: '/dashboard/mentor/messages', icon: MessageCircle },
        { name: 'Sessions', href: '/dashboard/mentor/sessions', icon: Calendar },
        { name: 'Availability', href: '/dashboard/mentor/availability', icon: CheckCircle },
        { name: 'Settings', href: '/dashboard/settings', icon: Settings },
    ],
    admin: [
        { name: 'Overview', href: '/dashboard/admin', icon: LayoutDashboard },
        { name: 'Approvals', href: '/dashboard/admin/approvals', icon: CheckCircle },
        { name: 'Mentors', href: '/dashboard/admin/mentors', icon: Users },
        { name: 'Events', href: '/dashboard/admin/events', icon: CalendarDays },
        { name: 'Credits', href: '/dashboard/admin/credits', icon: Coins },
        { name: 'Feedbacks', href: '/dashboard/admin/feedbacks', icon: MessageSquare },
        { name: 'Blog', href: '/dashboard/admin/blog', icon: PenBoxIcon },
        { name: 'Reports', href: '/dashboard/admin/reports', icon: FileText },
        { name: 'Transactions', href: '/dashboard/admin/transactions', icon: CreditCard },
    ],
    'admin-dev': [ // Same as admin for now
        { name: 'Overview', href: '/dashboard/admin', icon: LayoutDashboard },
        { name: 'Approvals', href: '/dashboard/admin/approvals', icon: CheckCircle },
        { name: 'Mentors', href: '/dashboard/admin/mentors', icon: Users },
        { name: 'Events', href: '/dashboard/admin/events', icon: CalendarDays },
        { name: 'Credits', href: '/dashboard/admin/credits', icon: Coins },
        { name: 'Feedbacks', href: '/dashboard/admin/feedbacks', icon: MessageSquare },
        { name: 'Blog', href: '/dashboard/admin/blog', icon: PenBoxIcon },
        { name: 'Reports', href: '/dashboard/admin/reports', icon: FileText },
        { name: 'Transactions', href: '/dashboard/admin/transactions', icon: CreditCard },
    ]
}

export default function Sidebar({ role, userName, userId }: SidebarProps) {
    const pathname = usePathname()
    const supabase = createClient()
    const [expandedSections, setExpandedSections] = useState<string[]>(['Events'])

    // Determine effective role for admin-dev to show relevant sidebar on different dashboard pages
    let effectiveRole = role
    if (role === 'admin-dev') {
        if (pathname.startsWith('/dashboard/student')) effectiveRole = 'student'
        else if (pathname.startsWith('/dashboard/mentor')) effectiveRole = 'mentor'
        else if (pathname.startsWith('/dashboard/admin')) effectiveRole = 'admin-dev'
    }

    // Fallback to student if role not found
    const menuItems = navigation[effectiveRole as keyof typeof navigation] || navigation.student

    const handleSignOut = async () => {
        await supabase.auth.signOut()
        window.location.href = '/login'
    }

    return (
        <aside className="w-64 bg-white border-r border-gray-100 flex flex-col h-screen fixed left-0 top-0 z-50">
            {/* Top Branding & Search */}
            <div className="p-6 pb-2">
                <div className="flex items-center justify-between mb-8">
                    <Logo className="h-8" />
                    {/* <NotificationBell /> */}
                </div>

                {/* Search Bar */}
                <div className="relative mb-6">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search..."
                        className="w-full bg-gray-50 border border-gray-100 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-accent/5 focus:border-accent/20 transition-all placeholder:text-gray-400"
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 bg-white border border-gray-100 rounded-md px-1.5 py-0.5 text-[10px] text-gray-400 font-mono">
                        ⌘K
                    </div>
                </div>
            </div>

            {/* Academic Profile Card - Students Only */}
            {effectiveRole === 'student' && userId && (
                <AcademicProfileCard userId={userId} userName={userName} />
            )}

            {/* Navigation Section */}
            <nav className="grow px-3 py-2 space-y-1 overflow-y-auto">
                {menuItems.map((item) => {
                    const isActive = pathname === item.href
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group ${isActive
                                ? 'bg-gray-50 text-accent'
                                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                                }`}
                        >
                            <item.icon className={`w-5 h-5 transition-colors ${isActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'}`} />
                            <span className="font-medium text-sm">{item.name}</span>
                        </Link>
                    )
                })}

                {/* Expandable Sections (only for student) */}
                {effectiveRole === 'student' && studentSections.map((section) => {
                    const isExpanded = expandedSections.includes(section.name)
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
                                    ? 'bg-gray-50 text-accent'
                                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    <section.icon className={`w-5 h-5 transition-colors ${isAnySectionActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'}`} />
                                    <span className="font-medium text-sm">{section.name}</span>
                                </div>
                                <ChevronDown
                                    className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
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
                                                    ? 'bg-blue-50 text-blue-600'
                                                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                                                    }`}
                                            >
                                                <sub.icon className={`w-4 h-4 transition-colors ${isSubActive ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'}`} />
                                                <span className="font-medium text-sm">{sub.name}</span>
                                            </Link>
                                        )
                                    })}
                                </div>
                            </div>
                        </div>
                    )
                })}
            </nav>

            {/* Footer Section */}
            <div className="p-3 border-t border-gray-50 bg-gray-50/30">
                <div className="flex items-center justify-between py-3 px-2 bg-white  rounded-md group cursor-pointer hover:border-accent/10 transition-all">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-accent text-white flex items-center justify-center text-xs font-bold shrink-0">
                            {userName?.[0] || 'U'}
                        </div>
                        <div className="flex flex-col min-w-0">
                            <span className="text-sm font-semibold text-gray-900 truncate">{userName || 'User'}</span>
                            <span className="text-[10px] text-gray-400 uppercase tracking-tighter truncate">{role}</span>
                        </div>
                    </div>
                    {/* <svg className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M6 9l6 6 6-6" />
                    </svg> */}
                </div>

                <button
                    onClick={handleSignOut}
                    className="mt-2 w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-400 hover:bg-red-50 hover:text-red-500 transition-all text-sm group"
                >
                    <LogOut className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                    <span>Sign Out</span>
                </button>
            </div>
        </aside>
    )
}
