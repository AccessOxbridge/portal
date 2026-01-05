'use client'

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
    PenBoxIcon
} from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { Logo } from '../logo'

interface SidebarProps {
    role: string;
    userName: string;
}

const navigation = {
    student: [
        { name: 'Explore', href: '/dashboard/student', icon: Search },
        { name: 'My Sessions', href: '/dashboard/student/sessions', icon: Calendar },
        { name: 'Settings', href: '/dashboard/settings', icon: Settings },
    ],
    mentor: [
        { name: 'Dashboard', href: '/dashboard/mentor', icon: LayoutDashboard },
        { name: 'Sessions', href: '/dashboard/mentor/sessions', icon: Calendar },
        { name: 'Availability', href: '/dashboard/mentor/availability', icon: CheckCircle },
        { name: 'Settings', href: '/dashboard/settings', icon: Settings },
    ],
    admin: [
        { name: 'Overview', href: '/dashboard/admin', icon: LayoutDashboard },
        { name: 'Approvals', href: '/dashboard/admin/approvals', icon: CheckCircle },
        { name: 'Mentors', href: '/dashboard/admin/mentors', icon: Users },
        { name: 'Blog', href: '/dashboard/admin/blog', icon: PenBoxIcon },
        { name: 'Reports', href: '/dashboard/admin/reports', icon: FileText },
        { name: 'Transactions', href: '/dashboard/admin/transactions', icon: CreditCard },
    ],
    'admin-dev': [ // Same as admin for now
        { name: 'Overview', href: '/dashboard/admin', icon: LayoutDashboard },
        { name: 'Approvals', href: '/dashboard/admin/approvals', icon: CheckCircle },
        { name: 'Mentors', href: '/dashboard/admin/mentors', icon: Users },
        { name: 'Blog', href: '/dashboard/admin/blog', icon: PenBoxIcon },
        { name: 'Reports', href: '/dashboard/admin/reports', icon: FileText },
        { name: 'Transactions', href: '/dashboard/admin/transactions', icon: CreditCard },
    ]
}

export default function Sidebar({ role, userName }: SidebarProps) {
    const pathname = usePathname()
    const supabase = createClient()

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
                    {/* <div className="flex gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400">
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>
                        </div>
                        <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400">
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 6h16M4 12h16m-7 6h7" /></svg>
                        </div>
                    </div> */}
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
