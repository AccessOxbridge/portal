import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { redirect } from 'next/navigation'
import FeedbackTable from './feedback-table'
import FeedbackOverview, { type MentorRatingSummary } from './feedback-overview'

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

    // The caller is a confirmed admin, so the rest of this page reads through
    // the service-role client. `sessions` has no admin SELECT policy — its only
    // policy is `auth.uid() = student_id OR auth.uid() = mentor_id` — so under
    // RLS an admin reads zero session rows, which left every mentor and student
    // on this page showing "Unknown" and the response-rate denominator at 0.
    // Reads only; nothing here writes. Same pattern as fetchMentors() in
    // ../mentors/actions.ts.
    const db = createAdminClient()

    // Fetch all student feedback
    const { data: feedbacks } = await db
        .from('form_responses')
        .select('id, responses, rating, created_at, session_id')
        .eq('form_type', 'student_feedback')
        .order('created_at', { ascending: false })


    // If we have feedbacks, fetch the related sessions
    const sessionIds = feedbacks?.map(f => f.session_id).filter(Boolean) || []

    let sessionMap = new Map<string, { mentor_id: string | null; student_id: string | null; scheduled_at: string | null; transcript_url: string | null }>()
    if (sessionIds.length > 0) {
        const { data: sessions } = await db
            .from('sessions')
            .select('id, scheduled_at, mentor_id, student_id, transcript_url')
            .in('id', sessionIds)

        sessionMap = new Map(sessions?.map(s => [s.id, s]) || [])
    }

    // Fetch session reports for transcripts
    let reportMap = new Map<string, { raw_transcript: string | null; summary: string | null }>()
    if (sessionIds.length > 0) {
        const { data: reports } = await db
            .from('session_reports')
            .select('session_id, raw_transcript, summary')
            .in('session_id', sessionIds)

        reportMap = new Map(reports?.map(r => [r.session_id, r]) || [])
    }

    // Get unique mentor and student IDs from sessions
    const mentorIds = [...new Set(Array.from(sessionMap.values()).map(s => s.mentor_id).filter(Boolean))] as string[]
    const studentIds = [...new Set(Array.from(sessionMap.values()).map(s => s.student_id).filter(Boolean))] as string[]


    // Fetch mentor and student profiles
    let mentorMap = new Map<string, string | null>()
    let studentMap = new Map<string, string | null>()

    if (mentorIds.length > 0) {
        const { data: mentors } = await db
            .from('profiles')
            .select('id, full_name')
            .in('id', mentorIds)
        mentorMap = new Map(mentors?.map(m => [m.id, m.full_name]) || [])
    }

    if (studentIds.length > 0) {
        const { data: students } = await db
            .from('profiles')
            .select('id, full_name')
            .in('id', studentIds)
        studentMap = new Map(students?.map(s => [s.id, s.full_name]) || [])
    }

    // Transform data for table
    const tableData = feedbacks?.map(f => {
        const session = sessionMap.get(f.session_id)
        const report = reportMap.get(f.session_id)
        const responses = f.responses as Record<string, any>
        return {
            id: f.id,
            sessionId: f.session_id,
            studentName: session?.student_id ? studentMap.get(session.student_id) || 'Unknown' : 'Unknown',
            mentorName: session?.mentor_id ? mentorMap.get(session.mentor_id) || 'Unknown' : 'Unknown',
            mentorId: session?.mentor_id || '',
            rating: f.rating ?? (Number(responses?.mentor_rating) || 0),
            helpful: responses?.session_helpful || 'N/A',
            experience: responses?.experience || '',
            sessionDate: session?.scheduled_at || null,
            submittedAt: f.created_at,
            transcript: report?.raw_transcript || null,
            transcriptUrl: session?.transcript_url || null,
            summary: report?.summary || null
        }
    }) || []

    // Per-mentor aggregates for the overview charts. Built from the same rows
    // the table renders, so the numbers can never disagree with it.
    const perMentor = new Map<string, { name: string; ratings: number[] }>()
    tableData.forEach(row => {
        if (!row.mentorId || !row.rating) return
        const entry = perMentor.get(row.mentorId) || { name: row.mentorName, ratings: [] }
        entry.ratings.push(row.rating)
        perMentor.set(row.mentorId, entry)
    })

    const mentorSummaries: MentorRatingSummary[] = Array.from(perMentor.entries()).map(
        ([mentorId, { name, ratings }]) => ({
            mentorId,
            mentorName: name,
            average: ratings.reduce((a, b) => a + b, 0) / ratings.length,
            count: ratings.length,
        })
    )

    const allRatings = tableData.map(r => r.rating).filter(r => r > 0)
    const overallAverage =
        allRatings.length > 0
            ? allRatings.reduce((a, b) => a + b, 0) / allRatings.length
            : null

    // Denominator for the response rate.
    const { count: completedSessions } = await db
        .from('sessions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'completed')

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

            <FeedbackOverview
                totalResponses={allRatings.length}
                overallAverage={overallAverage}
                completedSessions={completedSessions || 0}
                mentors={mentorSummaries}
            />

            <FeedbackTable feedbacks={tableData} />
        </div>
    )
}
