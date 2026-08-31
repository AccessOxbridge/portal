'use server'

import { sendMentorApprovedMessage } from '@/lib/claire-auto-messages'
import { createAdminClient } from '@/utils/supabase/admin'
import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

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

export interface MentorStatusCounts {
    all: number
    active: number
    pending_approval: number
    details_required: number
}

export interface FetchMentorsResult {
    mentors: Mentor[]
    totalCount: number
    statusCounts: MentorStatusCounts
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
        return { mentors: [], totalCount: 0, statusCounts: EMPTY_STATUS_COUNTS }
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

    // Fetch ratings from form_responses. Ratings were historically written only
    // into `responses.mentor_rating`; newer rows populate the `rating` column
    // too, so read both and prefer the column.
    const { data: feedbackData } = await supabase
        .from('form_responses')
        .select('session_id, rating, responses')
        .eq('form_type', 'student_feedback')

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
        const responses = (fb.responses || {}) as Record<string, any>
        const star = fb.rating ?? Number(responses.mentor_rating)
        if (mentorId && star && !Number.isNaN(star)) {
            if (!ratingMap[mentorId]) ratingMap[mentorId] = []
            ratingMap[mentorId].push(star)
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

    // Status counts are taken *before* the status filter but *after* every other
    // filter, so the header tiles read as "within what you're currently looking
    // at, this many are pending" rather than ignoring the search box.
    const statusCounts: MentorStatusCounts = {
        all: enrichedMentors.length,
        active: 0,
        pending_approval: 0,
        details_required: 0
    }
    enrichedMentors.forEach(m => {
        const status = (m.status || 'details_required') as keyof MentorStatusCounts
        if (status in statusCounts && status !== 'all') statusCounts[status] += 1
    })

    // Apply status filter
    if (statusFilter !== 'all') {
        enrichedMentors = enrichedMentors.filter(
            m => (m.status || 'details_required') === statusFilter
        )
    }

    // Paginate
    const offset = (page - 1) * limit
    const paginatedMentors = enrichedMentors.slice(offset, offset + limit)

    return {
        mentors: paginatedMentors,
        totalCount: enrichedMentors.length,
        statusCounts
    }
}

const EMPTY_STATUS_COUNTS: MentorStatusCounts = {
    all: 0,
    active: 0,
    pending_approval: 0,
    details_required: 0
}

const MENTOR_STATUSES = ['active', 'pending_approval', 'details_required'] as const
type MentorStatus = (typeof MENTOR_STATUSES)[number]

export async function setMentorStatus(
    mentorId: string,
    newStatus: string
): Promise<{ error?: string }> {
    const authed = await createClient()
    const {
        data: { user },
    } = await authed.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    const { data: caller } = await authed
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (!caller || (caller.role !== 'admin' && caller.role !== 'admin-dev')) {
        return { error: 'Not authorized' }
    }

    if (!MENTOR_STATUSES.includes(newStatus as MentorStatus)) {
        return { error: 'Invalid status' }
    }

    const admin = createAdminClient()
    const { error } = await admin
        .from('mentors')
        .update({ status: newStatus as MentorStatus, updated_at: new Date().toISOString() })
        .eq('id', mentorId)

    if (error) {
        console.error('setMentorStatus failed:', error.message)
        return { error: 'Failed to update mentor status' }
    }

    if (newStatus === 'active') {
        await sendMentorApprovedMessage(mentorId)
    }

    revalidatePath('/dashboard/admin/mentors')
    return {}
}

export interface MentorRatingRow {
    sessionId: string
    rating: number
    comment: string | null
    tags: string[]
    submittedAt: string
    sessionDate: string | null
}

export interface MentorSessionStats {
    sessionsCompleted: number
    avgRating: number | null
    ratings: MentorRatingRow[]
}

/**
 * Session counts and student ratings for one mentor, for the admin mentor
 * detail page.
 *
 * This lives in a server action rather than in the page because that page is a
 * client component, and `sessions` has no admin SELECT policy — its only policy
 * is `auth.uid() = student_id OR auth.uid() = mentor_id`. Queried from the
 * browser as an admin it returns zero rows, so the session count and every
 * rating silently came back empty. Reads only, behind an explicit admin check.
 */
export async function fetchMentorSessionStats(
    mentorId: string
): Promise<MentorSessionStats> {
    const empty: MentorSessionStats = { sessionsCompleted: 0, avgRating: null, ratings: [] }

    const authed = await createClient()
    const {
        data: { user },
    } = await authed.auth.getUser()
    if (!user) return empty

    const { data: caller } = await authed
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (!caller || (caller.role !== 'admin' && caller.role !== 'admin-dev')) {
        return empty
    }

    const admin = createAdminClient()

    const { count: sessionsCompleted } = await admin
        .from('sessions')
        .select('*', { count: 'exact', head: true })
        .eq('mentor_id', mentorId)
        .eq('status', 'completed')

    const { data: sessionsData } = await admin
        .from('sessions')
        .select('id, scheduled_at')
        .eq('mentor_id', mentorId)

    const sessionIds = (sessionsData || []).map((s) => s.id)
    if (sessionIds.length === 0) {
        return { ...empty, sessionsCompleted: sessionsCompleted || 0 }
    }

    const sessionDates = new Map((sessionsData || []).map((s) => [s.id, s.scheduled_at]))

    const { data: feedbackData } = await admin
        .from('form_responses')
        .select('session_id, rating, responses, created_at')
        .eq('form_type', 'student_feedback')
        .in('session_id', sessionIds)

    // Ratings were historically written only into `responses.mentor_rating`;
    // newer rows populate the `rating` column too. Prefer the column, fall back
    // to the JSON so pre-fix feedback still counts.
    const ratings: MentorRatingRow[] = (feedbackData || [])
        .map((fb) => {
            const responses = (fb.responses || {}) as Record<string, any>
            const star = fb.rating ?? Number(responses.mentor_rating)
            if (!star || Number.isNaN(star)) return null
            return {
                sessionId: fb.session_id,
                rating: star as number,
                comment: (responses.experience as string) || null,
                tags: Array.isArray(responses.tags) ? (responses.tags as string[]) : [],
                submittedAt: fb.created_at || new Date().toISOString(),
                sessionDate: sessionDates.get(fb.session_id) ?? null,
            }
        })
        .filter((r): r is MentorRatingRow => r !== null)

    const avgRating =
        ratings.length > 0
            ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length
            : null

    return { sessionsCompleted: sessionsCompleted || 0, avgRating, ratings }
}
