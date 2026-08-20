'use client'

import { useState, useEffect, type ReactNode } from 'react'
import Sidebar from '@/components/dashboard/sidebar'
import MobileTopBar from '@/components/dashboard/mobile-top-bar'
import MobileTabBar from '@/components/dashboard/mobile-tab-bar'
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
        // 100dvh rather than 100vh so the mobile URL bar doesn't crop the layout.
        <div className="flex h-[100dvh] overflow-hidden">
            {showSidebar && (
                <Sidebar
                    {...sidebarProps}
                    collapsed={collapsed}
                    onToggleCollapse={toggleCollapsed}
                />
            )}

            <main
                className={cn(
                    'flex-1 min-h-0 overflow-x-hidden overscroll-contain transition-[margin-left] duration-300 ease-in-out',
                    showSidebar
                        ? 'bg-[#F9FAFB] overflow-y-auto'
                        : 'bg-white overflow-hidden',
                    // Sidebar is `hidden md:flex`, so the offset only applies from md up.
                    showSidebar && (collapsed ? 'md:ml-[4.5rem]' : 'md:ml-64')
                )}
            >
                {showSidebar && <MobileTopBar />}

                {showSidebar ? (
                    <div
                        className={cn(
                            'max-w-[1600px] mx-auto p-4 md:p-10 animate-in fade-in slide-in-from-bottom-4 duration-700',
                            // Clear the fixed bottom tab bar on phones.
                            'pb-24 md:pb-10'
                        )}
                    >
                        {children}
                    </div>
                ) : (
                    <div className="h-full min-h-0">{children}</div>
                )}
            </main>

            {showSidebar && <MobileTabBar {...sidebarProps} />}

            {footer}
        </div>
    )
}
