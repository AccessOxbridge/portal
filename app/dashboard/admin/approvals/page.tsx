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
        <div className="space-y-12">
            <header className="flex justify-between items-center">
                <div>
                    <h1 className="text-5xl font-extrabold text-accent tracking-tight">Application Approvals</h1>
                    <p className="mt-4 text-gray-500 text-xl font-medium">Review and manage mentor onboarding applications.</p>
                </div>
                <div className="flex space-x-2">
                    <span className="bg-rich-beige-accent text-accent px-6 py-3 rounded-2xl text-sm font-bold shadow-inner">
                        {applications?.length || 0} Pending
                    </span>
                </div>
            </header>

            {!applications || applications.length === 0 ? (
                <div className="bg-white border-2 border-dashed border-gray-100 rounded-[40px] p-24 text-center">
                    <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-8">
                        <svg className="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                        </svg>
                    </div>
                    <h2 className="text-3xl font-extrabold text-gray-800">All caught up!</h2>
                    <p className="text-gray-500 mt-4 text-lg">No pending applications to review right now.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-8">
                    {applications.map((app: any) => (
                        <div key={app.id} className="bg-white shadow-xl shadow-gray-200/50 rounded-[40px] border border-gray-100 overflow-hidden hover:shadow-indigo-100 transition-all group">
                            <div className="p-10">
                                <div className="flex justify-between items-start mb-8">
                                    <div className="flex items-center gap-4">
                                        <div className="w-16 h-16 bg-accent rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-lg group-hover:scale-110 transition-transform">
                                            {app.profiles?.full_name?.[0] || '?'}
                                        </div>
                                        <div>
                                            <h3 className="text-2xl font-bold text-gray-900">{app.profiles?.full_name || 'Unknown User'}</h3>
                                            <p className="text-gray-400 font-medium">{new Date(app.created_at).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-3">
                                        <form action={handleApplication.bind(null, app.id, 'dismissed', app.user_id)}>
                                            <button className="px-8 py-4 rounded-2xl border border-gray-100 text-gray-500 font-bold hover:bg-red-50 hover:text-red-500 hover:border-red-100 transition-all">
                                                Dismiss
                                            </button>
                                        </form>
                                        <form action={handleApplication.bind(null, app.id, 'approved', app.user_id)}>
                                            <button className="px-8 py-4 rounded-2xl bg-accent text-white font-bold hover:shadow-2xl hover:shadow-accent/40 transition-all transform hover:-translate-y-1">
                                                Approve
                                            </button>
                                        </form>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-gray-50 rounded-[32px] p-8 border border-gray-100 shadow-inner">
                                    {Object.entries(app.responses).map(([key, value]: [string, any]) => (
                                        <div key={key}>
                                            <span className="block text-[10px] font-black text-accent uppercase tracking-widest mb-2 opacity-60">{key.replace('_', ' ')}</span>
                                            <div className="text-gray-900 font-semibold leading-relaxed">
                                                {Array.isArray(value) ? (
                                                    <div className="flex flex-wrap gap-2 mt-2">
                                                        {value.map(v => (
                                                            <span key={v} className="bg-white border border-gray-200 px-4 py-1.5 rounded-xl text-xs font-bold text-gray-700 shadow-sm">{v}</span>
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
