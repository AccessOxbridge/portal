import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { handleApplication } from './actions'

export default async function AdminApprovalsPage() {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) return redirect('/login')

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (!profile || (profile.role !== 'admin' && profile.role !== 'admin-dev')) return redirect('/dashboard')

    const { data: applications } = await supabase
        .from('mentor_applications')
        .select(`
            *,
            profiles (
                full_name,
                id
            )
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })

    return (
        <div className="p-8 max-w-6xl mx-auto">
            <header className="mb-10 flex justify-between items-center">
                <div>
                    <h1 className="text-4xl font-extrabold text-gray-900">Application Approvals</h1>
                    <p className="mt-2 text-gray-500 font-medium">Review and manage mentor onboarding applications.</p>
                </div>
                <div className="flex space-x-2">
                    <span className="bg-indigo-100 text-indigo-700 px-4 py-2 rounded-full text-sm font-bold">
                        {applications?.length || 0} Pending
                    </span>
                </div>
            </header>

            {!applications || applications.length === 0 ? (
                <div className="bg-white border-2 border-dashed border-gray-200 rounded-3xl p-20 text-center">
                    <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                        <svg className="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800">All caught up!</h2>
                    <p className="text-gray-500 mt-2">No pending applications to review right now.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-6">
                    {applications.map((app: any) => (
                        <div key={app.id} className="bg-white shadow-xl rounded-3xl border border-gray-100 overflow-hidden hover:shadow-2xl transition-all">
                            <div className="p-8">
                                <div className="flex justify-between items-start mb-6">
                                    <div className="flex items-center">
                                        <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-lg">
                                            {app.profiles?.full_name?.[0] || '?'}
                                        </div>
                                        <div className="ml-4">
                                            <h3 className="text-xl font-bold text-gray-900">{app.profiles?.full_name || 'Unknown User'}</h3>
                                            <p className="text-gray-400 text-sm">{new Date(app.created_at).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                    <div className="flex space-x-3">
                                        <form action={handleApplication.bind(null, app.id, 'dismissed', app.user_id)}>
                                            <button className="px-6 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-bold hover:bg-gray-50 transition-colors">
                                                Dismiss
                                            </button>
                                        </form>
                                        <form action={handleApplication.bind(null, app.id, 'approved', app.user_id)}>
                                            <button className="px-6 py-2.5 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all transform hover:scale-105">
                                                Approve
                                            </button>
                                        </form>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-gray-50 rounded-2xl p-6 border border-gray-100">
                                    {Object.entries(app.responses).map(([key, value]: [string, any]) => (
                                        <div key={key}>
                                            <span className="block text-xs font-bold text-indigo-500 uppercase tracking-wider mb-1">{key.replace('_', ' ')}</span>
                                            <div className="text-gray-800 text-sm font-medium leading-relaxed">
                                                {Array.isArray(value) ? (
                                                    <div className="flex flex-wrap gap-2 mt-1">
                                                        {value.map(v => (
                                                            <span key={v} className="bg-white border border-gray-200 px-3 py-1 rounded-lg text-xs">{v}</span>
                                                        ))}
                                                    </div>
                                                ) : value}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
