import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import FeedbackContent from './feedback-content'
import { getMentorPhotoUrl } from '@/lib/mentor-photo'

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
        .select(`
            student_id,
            scheduled_at,
            mentor:profiles!sessions_mentor_id_fkey (
                full_name,
                photo_url:mentors(photo_url)
            )
        `)
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
        redirect('/dashboard/student/sessions?message=Feedback already submitted')
    }

    const mentor = session.mentor as any

    return (
        <FeedbackContent
            sessionId={sessionId}
            mentorName={mentor?.full_name || 'your mentor'}
            mentorPhotoUrl={getMentorPhotoUrl(mentor)}
            scheduledAt={session.scheduled_at}
        />
    )
}
