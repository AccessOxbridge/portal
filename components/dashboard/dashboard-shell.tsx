'use client'

import { useState, useEffect, type ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import Sidebar from '@/components/dashboard/sidebar'
import MobileTopBar from '@/components/dashboard/mobile-top-bar'
import MobileTabBar from '@/components/dashboard/mobile-tab-bar'
import { LogoWatermark } from './logo-watermark'
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
    const pathname = usePathname()

    // Admin pages are compact (14px, tighter tables); everything else is
    // comfortable (16px, 44px touch targets). Set on the wrapper for the first
    // paint and mirrored onto <html> for dialogs and menus, which render at the
    // end of <body>.
    const density = pathname?.startsWith('/dashboard/admin') ? 'compact' : 'comfortable'
    useEffect(() => {
        document.documentElement.dataset.density = density
        return () => {
            document.documentElement.dataset.density = 'comfortable'
        }
    }, [density])

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
        // isolate: the watermark's -z-10 stays inside this shell, above its
        // background and below everything else, without new stacking layers.
        <div data-density={density} className="isolate flex h-[100dvh] overflow-hidden bg-background">
            {showSidebar && (
                <Sidebar
                    {...sidebarProps}
                    collapsed={collapsed}
                    onToggleCollapse={toggleCollapsed}
                />
            )}

            <main
                className={cn(
                    'flex-1 min-h-0 overflow-x-hidden overscroll-contain transition-[margin-left] duration-200 ease-snappy motion-reduce:transition-none',
                    showSidebar
                        // Transparent so the shell's background (and the
                        // watermark painted on it) shows through.
                        ? 'overflow-y-auto'
                        // Sidebar-less screens (mentor onboarding, Application
                        // Pending) still need to scroll, or short viewports
                        // strand content, e.g. Sign Out, below the fold.
                        : 'bg-card overflow-y-auto',
                    // Sidebar is `hidden md:flex`, so the offset only applies from md up.
                    showSidebar && (collapsed ? 'md:ml-[4.5rem]' : 'md:ml-64')
                )}
            >
                {showSidebar && <MobileTopBar />}
                {showSidebar && <LogoWatermark sidebarCollapsed={collapsed} />}

                {showSidebar ? (
                    <div
                        className={cn(
                            'max-w-[1600px] mx-auto p-4 md:p-10',
                            // Clear the fixed bottom tab bar on phones.
                            'pb-28 md:pb-10'
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
