import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import FeedbackTable from './feedback-table'

export default async function AdminFeedbacksPage() {
    const supabase = await createClient()

    // Check if user is admin
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
        redirect('/login')
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (!profile || !['admin', 'admin-dev'].includes(profile.role)) {
        redirect('/dashboard')
    }

    // Fetch all student feedback
    const { data: feedbacks, error: feedbackError } = await supabase
        .from('form_responses')
        .select('id, responses, created_at, session_id')
        .eq('form_type', 'student_feedback')
        .order('created_at', { ascending: false })

    console.log('[FEEDBACKS DEBUG] Query result:', { feedbacks, feedbackError, count: feedbacks?.length })

    // If we have feedbacks, fetch the related sessions
    const sessionIds = feedbacks?.map(f => f.session_id).filter(Boolean) || []

    let sessionMap = new Map<string, { mentor_id: string | null; student_id: string | null; scheduled_at: string | null; transcript_url: string | null }>()
    if (sessionIds.length > 0) {
        const { data: sessions } = await supabase
            .from('sessions')
            .select('id, scheduled_at, mentor_id, student_id, transcript_url')
            .in('id', sessionIds)

        sessionMap = new Map(sessions?.map(s => [s.id, s]) || [])
    }

    // Fetch session reports for transcripts
    let reportMap = new Map<string, { raw_transcript: string | null; summary: string | null }>()
    if (sessionIds.length > 0) {
        const { data: reports } = await supabase
            .from('session_reports')
            .select('session_id, raw_transcript, summary')
            .in('session_id', sessionIds)

        reportMap = new Map(reports?.map(r => [r.session_id, r]) || [])
    }

    // Get unique mentor and student IDs from sessions
    const mentorIds = [...new Set(Array.from(sessionMap.values()).map(s => s.mentor_id).filter(Boolean))] as string[]
    const studentIds = [...new Set(Array.from(sessionMap.values()).map(s => s.student_id).filter(Boolean))] as string[]

    console.log('[FEEDBACKS DEBUG] IDs:', { mentorIds, studentIds })

    // Fetch mentor and student profiles
    let mentorMap = new Map<string, string | null>()
    let studentMap = new Map<string, string | null>()

    if (mentorIds.length > 0) {
        const { data: mentors, error: mentorError } = await supabase
            .from('profiles')
            .select('id, full_name')
            .in('id', mentorIds)
        console.log('[FEEDBACKS DEBUG] Mentors:', { mentors, mentorError })
        mentorMap = new Map(mentors?.map(m => [m.id, m.full_name]) || [])
    }

    if (studentIds.length > 0) {
        const { data: students, error: studentError } = await supabase
            .from('profiles')
            .select('id, full_name')
            .in('id', studentIds)
        console.log('[FEEDBACKS DEBUG] Students:', { students, studentError })
        studentMap = new Map(students?.map(s => [s.id, s.full_name]) || [])
    }

    // Transform data for table
    const tableData = feedbacks?.map(f => {
        const session = sessionMap.get(f.session_id)
        const report = reportMap.get(f.session_id)
        const responses = f.responses as Record<string, any>
        return {
            id: f.id,
            studentName: session?.student_id ? studentMap.get(session.student_id) || 'Unknown' : 'Unknown',
            mentorName: session?.mentor_id ? mentorMap.get(session.mentor_id) || 'Unknown' : 'Unknown',
            mentorId: session?.mentor_id || '',
            rating: responses?.mentor_rating || 0,
            helpful: responses?.session_helpful || 'N/A',
            experience: responses?.experience || '',
            sessionDate: session?.scheduled_at || null,
            submittedAt: f.created_at,
            transcript: report?.raw_transcript || null,
            transcriptUrl: session?.transcript_url || null,
            summary: report?.summary || null
        }
    }) || []

    return (
        <div className="max-w-6xl mx-auto">
            <header className="mb-10">
                <h1 className="text-4xl font-extrabold text-accent tracking-tight">
                    Student Feedback
                </h1>
                <p className="mt-3 text-gray-500 text-lg">
                    Review feedback from students about their mentorship sessions
                </p>
            </header>

            <FeedbackTable feedbacks={tableData} />
        </div>
    )
}
