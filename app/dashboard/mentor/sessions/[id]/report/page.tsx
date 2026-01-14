import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import MentorReportForm from '@/components/forms/mentor-report-form'

export default async function MentorReportPage({
    params
}: {
    params: Promise<{ id: string }>
}) {
    const { id: sessionId } = await params
    const supabase = await createClient()

    // Verify user is the mentor for this session
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { data: session } = await supabase
        .from('sessions')
        .select('mentor_id')
        .eq('id', sessionId)
        .single()

    if (!session || session.mentor_id !== user.id) {
        redirect('/dashboard/mentor')
    }

    // Check if already submitted
    const { data: existing } = await supabase
        .from('form_responses')
        .select('id')
        .eq('session_id', sessionId)
        .eq('form_type', 'mentor_report')
        .single()

    if (existing) {
        redirect('/dashboard/mentor?message=Report already submitted')
    }

    return <MentorReportForm sessionId={sessionId} />
}
