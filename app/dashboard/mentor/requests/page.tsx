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
        .eq('initiated_by', 'student')
        .order('created_at', { ascending: false })

    return (
        <div className="space-y-12">
            <header>
                <h1 className="text-3xl font-semibold tracking-tight text-foreground text-balance sm:text-4xl">
                    Mentorship requests
                </h1>
                <p className="mt-4 text-muted-foreground text-xl font-medium">
                    Review and accept incoming session and reschedule requests from students.
                </p>
            </header>

            {!requests || requests.length === 0 ? (
                <div className="p-20 bg-muted/60 rounded-[40px] border-2 border-dashed border-border text-center">
                    <div className="size-16 bg-muted rounded-card flex items-center justify-center mx-auto mb-6">
                        <svg className="size-8 text-muted-foreground/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0a2 2 0 01-2 2H6a2 2 0 01-2-2m16 0l-8 4-8-4" />
                        </svg>
                    </div>
                    <h3 className="text-2xl font-semibold text-foreground mb-2">No pending requests</h3>
                    <p className="text-muted-foreground">We'll notify you when a student matches with your profile.</p>
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
