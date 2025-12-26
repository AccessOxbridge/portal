import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import Sidebar from '@/components/dashboard/sidebar'

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        return redirect('/login')
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select(`
            full_name, 
            role,
            mentor_applications (
                status
            )
        `)
        .eq('id', user.id)
        .single()

    if (!profile) {
        return redirect('/login')
    }

    let showSidebar = true
    if (profile.role === 'mentor' || profile.role === 'admin-dev') {
        const application = profile.mentor_applications?.[0]

        // Hide sidebar if:
        // 1. Role is mentor and no application exists yet (onboarding)
        // 2. Application exists but is not approved
        if (profile.role === 'mentor' && !application) {
            showSidebar = false
        } else if (application && (application.status === 'pending' || application.status === 'dismissed')) {
            showSidebar = false
        }
    }

    return (
        <div className="flex min-h-screen">
            {/* Sidebar with fixed width */}
            {showSidebar && (
                <Sidebar
                    role={profile.role}
                    userName={profile.full_name || user.email?.split('@')[0] || 'User'}
                />
            )}

            {/* Main Content Area */}
            <main className={`flex-1 ${showSidebar ? 'ml-64' : ''} min-h-screen overflow-x-hidden`}>
                <div className="max-w-7xl mx-auto p-4 md:p-8 lg:p-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    {children}
                </div>
            </main>
        </div>
    )
}
