import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export default async function AdminDashboard() {
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

    if (!profile || profile.role !== 'admin') {
        return redirect('/dashboard')
    }

    return (
        <div className="p-8">
            <h1 className="text-3xl font-bold text-red-600">Admin Dashboard</h1>
            <p className="mt-4">System Administrator: {profile.full_name}</p>
            <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="p-6 bg-white shadow rounded-lg border border-gray-200 col-span-2">
                    <h2 className="text-xl font-semibold">Platform Overview</h2>
                    <p className="text-gray-600">Monitor students and mentors activity.</p>
                </div>
                <div className="p-6 bg-white shadow rounded-lg border border-gray-200">
                    <h2 className="text-xl font-semibold">User Approval</h2>
                    <p className="text-gray-600">Review and approve new mentors.</p>
                </div>
                <div className="p-6 bg-white shadow rounded-lg border border-gray-200">
                    <h2 className="text-xl font-semibold">Payouts</h2>
                    <p className="text-gray-600">Manage fortnightly mentor payments.</p>
                </div>
            </div>
        </div>
    )
}
