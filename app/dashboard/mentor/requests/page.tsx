import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { MentorRequestCard } from './mentor-request-card'

export default async function MentorRequestsPage() {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) return redirect('/login')

    const { data: requests, error } = await supabase
        .from('mentorship_requests')
        .select(`
            *,
            student:profiles!mentorship_requests_student_id_fkey (
                full_name
            )
        `)
        .eq('mentor_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })

    return (
        <div className="space-y-12">
            <header>
                <h1 className="text-5xl font-extrabold text-accent tracking-tight">
                    Mentorship Requests
                </h1>
                <p className="mt-4 text-gray-500 text-xl font-medium">Review and accept incoming requests from students.</p>
            </header>

            {!requests || requests.length === 0 ? (
                <div className="p-20 bg-gray-50 rounded-[40px] border-2 border-dashed border-gray-200 text-center">
                    <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                        <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0a2 2 0 01-2 2H6a2 2 0 01-2-2m16 0l-8 4-8-4" />
                        </svg>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">No pending requests</h3>
                    <p className="text-gray-500">We'll notify you when a student matches with your profile.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-8">
                    {requests.map((request) => (
                        <MentorRequestCard key={request.id} request={request as any} />
                    ))}
                </div>
            )}
        </div>
    )
}
