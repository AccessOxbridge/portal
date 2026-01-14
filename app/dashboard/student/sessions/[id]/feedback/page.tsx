import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import StudentFeedbackForm from '@/components/forms/student-feedback-form'

export default async function StudentFeedbackPage({
    params
}: {
    params: Promise<{ id: string }>
}) {
    const { id: sessionId } = await params
    const supabase = await createClient()

    // Verify user is the student for this session
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { data: session } = await supabase
        .from('sessions')
        .select('student_id')
        .eq('id', sessionId)
        .single()

    if (!session || session.student_id !== user.id) {
        redirect('/dashboard/student')
    }

    // Check if already submitted
    const { data: existing } = await supabase
        .from('form_responses')
        .select('id')
        .eq('session_id', sessionId)
        .eq('form_type', 'student_feedback')
        .single()

    if (existing) {
        redirect('/dashboard/student?message=Feedback already submitted')
    }

    return <StudentFeedbackForm sessionId={sessionId} />
}
