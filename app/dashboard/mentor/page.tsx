import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export default async function MentorDashboard() {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        return redirect('/login')
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

    if (!profile || profile.role !== 'mentor') {
        return redirect('/dashboard')
    }

    return (
        <div className="p-8">
            <h1 className="text-3xl font-bold text-indigo-600">Mentor Dashboard</h1>
            <p className="mt-4">Welcome back, {profile.full_name}!</p>
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 bg-white shadow rounded-lg border border-gray-200">
                    <h2 className="text-xl font-semibold">Student Requests</h2>
                    <p className="text-gray-600">Manage incoming mentorship requests.</p>
                </div>
                <div className="p-6 bg-white shadow rounded-lg border border-gray-200">
                    <h2 className="text-xl font-semibold">Earnings</h2>
                    <p className="text-gray-600">Track your hourly sessions and payouts.</p>
                </div>
            </div>
        </div>
    )
}
