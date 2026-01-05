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
            mentors (
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
        const mentor = (profile as any).mentors
        const status = mentor?.status

        // Hide sidebar if:
        // 1. Role is mentor and no record exists yet (onboarding)
        // 2. Status is 'details_required' or 'pending_approval'
        if (profile.role === 'mentor' && (!mentor || status === 'details_required' || status === 'pending_approval')) {
            showSidebar = false
        }
    }

    return (
        <div className="flex min-h-screen">
            {/* Sidebar with fixed width */}
            {showSidebar && (
                <Sidebar
                    // we should not default to student! error handling - TODO  
                    role={profile.role || 'student'}
                    userName={profile.full_name || user.email?.split('@')[0] || 'User'}
                />
            )}

            {/* Main Content Area */}
            <main className={`flex-1 ${showSidebar ? 'ml-64' : ''} min-h-screen bg-[#F9FAFB]`}>
                <div className="max-w-[1600px] mx-auto p-6 md:p-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    {children}
                </div>
            </main>
        </div>
    )
}
