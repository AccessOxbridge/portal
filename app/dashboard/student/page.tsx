import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export default async function StudentDashboard() {
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

    if (!profile || profile.role !== 'student') {
        return redirect('/dashboard')
    }

    return (
        <div className="p-8">
            <h1 className="text-3xl font-bold">Student Dashboard</h1>
            <p className="mt-4">Welcome, {profile.full_name}!</p>
            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-6 bg-white shadow rounded-lg border border-gray-200">
                    <h2 className="text-xl font-semibold">My Mentors</h2>
                    <p className="text-gray-600">Find and connect with your mentors.</p>
                </div>
                <div className="p-6 bg-white shadow rounded-lg border border-gray-200">
                    <h2 className="text-xl font-semibold">Sessions</h2>
                    <p className="text-gray-600">View upcoming and past sessions.</p>
                </div>
                <div className="p-6 bg-white shadow rounded-lg border border-gray-200">
                    <h2 className="text-xl font-semibold">Payments</h2>
                    <p className="text-gray-600">Manage your subscriptions and invoices.</p>
                </div>
            </div>
        </div>
    )
}
