'use server'

import { createAdminClient } from '@/utils/supabase/admin'

export interface Mentor {
    id: string
    bio: string | null
    expertise: string[] | null
    status: string | null
    phone: string | null
    created_at: string
    photo_url: string | null
    questionnaire_completed_at: string | null
    contract_signed_at: string | null
    dbs_certificate_url: string | null
    payouts_enabled: boolean | null
    profile_completed_at: string | null
    profile: {
        full_name: string | null
        email: string | null
    } | null
    sessions_completed: number
    avg_rating: number | null
    university: string | null
}

export interface FetchMentorsResult {
    mentors: Mentor[]
    totalCount: number
}

export async function fetchMentors(
    statusFilter: string,
    searchTerm: string,
    universityFilter: string,
    subjectFilter: string,
    page: number,
    limit: number
): Promise<FetchMentorsResult> {
    const supabase = createAdminClient()

    // Fetch all mentors with profiles using admin client (bypasses RLS)
    const { data: mentorsData, error } = await supabase
        .from('mentors')
        .select(`
            *,
            profile:profiles!left (
                full_name,
                email
            )
        `)
        .order('created_at', { ascending: false })

    if (error || !mentorsData) {
        console.error('Error fetching mentors:', error)
        return { mentors: [], totalCount: 0 }
    }

    // Fetch session counts (completed sessions per mentor)
    const { data: sessionCounts } = await supabase
        .from('sessions')
        .select('mentor_id')
        .eq('status', 'completed')

    const sessionCountMap: Record<string, number> = {}
    sessionCounts?.forEach(s => {
        sessionCountMap[s.mentor_id] = (sessionCountMap[s.mentor_id] || 0) + 1
    })

    // Fetch ratings from form_responses
    const { data: feedbackData } = await supabase
        .from('form_responses')
        .select('session_id, rating')
        .eq('form_type', 'student_feedback')
        .not('rating', 'is', null)

    // Get session -> mentor mapping
    const { data: sessionsData } = await supabase
        .from('sessions')
        .select('id, mentor_id')

    const sessionMentorMap: Record<string, string> = {}
    sessionsData?.forEach(s => {
        sessionMentorMap[s.id] = s.mentor_id
    })

    // Calculate average ratings per mentor
    const ratingMap: Record<string, number[]> = {}
    feedbackData?.forEach(fb => {
        const mentorId = sessionMentorMap[fb.session_id]
        if (mentorId && fb.rating) {
            if (!ratingMap[mentorId]) ratingMap[mentorId] = []
            ratingMap[mentorId].push(fb.rating)
        }
    })

    const avgRatingMap: Record<string, number> = {}
    Object.entries(ratingMap).forEach(([mentorId, ratings]) => {
        avgRatingMap[mentorId] = ratings.reduce((a, b) => a + b, 0) / ratings.length
    })

    // Enrich mentor data
    let enrichedMentors = mentorsData.map(m => ({
        ...m,
        sessions_completed: sessionCountMap[m.id] || 0,
        avg_rating: avgRatingMap[m.id] || null
    })) as unknown as Mentor[]

    // Apply status filter
    if (statusFilter !== 'all') {
        enrichedMentors = enrichedMentors.filter(m => m.status === statusFilter)
    }

    // Apply university filter
    if (universityFilter && universityFilter !== 'all') {
        enrichedMentors = enrichedMentors.filter(m =>
            m.university?.toLowerCase().includes(universityFilter.toLowerCase())
        )
    }

    // Apply subject filter
    if (subjectFilter && subjectFilter !== 'all') {
        enrichedMentors = enrichedMentors.filter(m =>
            m.expertise?.some(exp => exp.toLowerCase().includes(subjectFilter.toLowerCase()))
        )
    }

    // Apply search filter
    if (searchTerm) {
        const term = searchTerm.toLowerCase()
        enrichedMentors = enrichedMentors.filter(mentor => {
            const nameMatch = mentor.profile?.full_name?.toLowerCase().includes(term)
            const expertiseMatch = mentor.expertise?.some(exp => exp.toLowerCase().includes(term))
            return nameMatch || expertiseMatch
        })
    }

    // Paginate
    const offset = (page - 1) * limit
    const paginatedMentors = enrichedMentors.slice(offset, offset + limit)

    return {
        mentors: paginatedMentors,
        totalCount: enrichedMentors.length
    }
}
