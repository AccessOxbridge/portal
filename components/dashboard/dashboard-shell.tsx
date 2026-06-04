'use client'

import { useState, useEffect, type ReactNode } from 'react'
import Sidebar from '@/components/dashboard/sidebar'
import { cn } from '@/utils/lib'

const STORAGE_KEY = 'dashboard-sidebar-collapsed'

type SidebarProps = React.ComponentProps<typeof Sidebar>

interface DashboardShellProps {
    showSidebar: boolean
    sidebarProps: SidebarProps
    children: ReactNode
    footer?: ReactNode
}

export default function DashboardShell({
    showSidebar,
    sidebarProps,
    children,
    footer,
}: DashboardShellProps) {
    const [collapsed, setCollapsed] = useState(false)

    useEffect(() => {
        if (localStorage.getItem(STORAGE_KEY) === 'true') {
            setCollapsed(true)
        }
    }, [])

    const toggleCollapsed = () => {
        setCollapsed((prev) => {
            const next = !prev
            localStorage.setItem(STORAGE_KEY, String(next))
            return next
        })
    }

    return (
        <div className="flex h-screen overflow-hidden">
            {showSidebar && (
                <Sidebar
                    {...sidebarProps}
                    collapsed={collapsed}
                    onToggleCollapse={toggleCollapsed}
                />
            )}

            <main
                className={cn(
                    'flex-1 min-h-0 bg-[#F9FAFB] overflow-y-auto overflow-x-hidden overscroll-contain transition-[margin-left] duration-300 ease-in-out',
                    showSidebar && (collapsed ? 'ml-[4.5rem]' : 'ml-64')
                )}
            >
                <div className="max-w-[1600px] mx-auto p-6 md:p-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    {children}
                </div>
            </main>

            {footer}
        </div>
    )
}
