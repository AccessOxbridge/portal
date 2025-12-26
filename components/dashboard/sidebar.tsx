'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
    LayoutDashboard,
    Users,
    Calendar,
    Settings,
    LogOut,
    BookOpen,
    Search,
    CreditCard,
    FileText,
    CheckCircle
} from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import Image from 'next/image'
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
        { name: 'Mentors', href: '/dashboard/admin/mentors', icon: Users },
        { name: 'Students', href: '/dashboard/admin/students', icon: BookOpen },
        { name: 'Reports', href: '/dashboard/admin/reports', icon: FileText },
        { name: 'Transactions', href: '/dashboard/admin/transactions', icon: CreditCard },
        { name: 'Settings', href: '/dashboard/settings', icon: Settings },
    ],
    'admin-dev': [ // Same as admin for now
        { name: 'Overview', href: '/dashboard/admin', icon: LayoutDashboard },
        { name: 'Approvals', href: '/dashboard/admin/approvals', icon: CheckCircle },
        { name: 'Mentors', href: '/dashboard/admin/mentors', icon: Users },
        { name: 'Reports', href: '/dashboard/admin/reports', icon: FileText },
        { name: 'Transactions', href: '/dashboard/admin/transactions', icon: CreditCard },
        { name: 'Settings', href: '/dashboard/settings', icon: Settings },
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
        <aside className="w-64 bg-accent text-white flex flex-col h-screen fixed left-0 top-0 shadow-2xl z-50">
            {/* Logo Section */}
            <Logo className='mt-8 mr-2' />

            {/* Navigation Section */}
            <nav className="grow pl-1 py-6 space-y-2 mt-4 overflow-y-auto">
                {menuItems.map((item) => {
                    const isActive = pathname === item.href
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all group ${isActive
                                ? 'bg-white/15 text-rich-amber-accent shadow-lg shadow-black/10'
                                : 'text-white/70 hover:bg-white/5 hover:text-white'
                                }`}
                        >
                            <item.icon className={`w-5 h-5 transition-transform group-hover:scale-110 ${isActive ? 'text-rich-amber-accent' : ''}`} />
                            <span className="font-medium text-lg tracking-wide">{item.name}</span>
                            {isActive && (
                                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-rich-amber-accent shadow-[0_0_8px_rich-amber-accent]" />
                            )}
                        </Link>
                    )
                })}
            </nav>

            {/* User Profile & Footer Section */}
            <div className="pl-1 py-6 border-t border-white/10 bg-black/5">
                <div className="flex items-center gap-4 mb-6 px-2">
                    <div className="w-10 h-10 rounded-full bg-rich-amber-accent flex items-center justify-center text-accent font-bold shadow-inner">
                        {userName?.[0] || 'U'}
                    </div>
                    <div className="flex flex-col min-w-0">
                        <span className="font-semibold text-sm truncate">{userName || 'User'}</span>
                        <span className="text-[10px] uppercase tracking-widest text-rich-amber-accent font-bold opacity-80">{role}</span>
                    </div>
                </div>

                <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl text-white/50 hover:bg-red-500/10 hover:text-red-400 transition-all group border border-transparent hover:border-red-500/20"
                >
                    <LogOut className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                    <span className="font-medium text-sm">Sign Out</span>
                </button>
            </div>
        </aside>
    )
}
