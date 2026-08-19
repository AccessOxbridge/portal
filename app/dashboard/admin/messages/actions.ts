'use server'

import { createAdminClient } from '@/utils/supabase/admin'
import { createClient } from '@/utils/supabase/server'

export interface MentorSupportThread {
    conversationId: string
    adminId: string
}

export interface ClaireThread {
    conversationId: string
    adminId: string
    type: 'support' | 'mentor_support'
    studentId: string | null
    mentorId: string | null
    createdAt: string
}

export interface MessageRecipient {
    id: string
    full_name: string | null
    email: string | null
    photo_url: string | null
    role: 'student' | 'mentor'
}

type AuthedAdmin = {
    userId: string
    supabase: ReturnType<typeof createAdminClient>
}

async function requireAdmin(): Promise<AuthedAdmin> {
    const authed = await createClient()
    const {
        data: { user },
    } = await authed.auth.getUser()

    if (!user) {
        throw new Error('Not authenticated')
    }

    const { data: profile } = await authed
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (!profile || (profile.role !== 'admin' && profile.role !== 'admin-dev')) {
        throw new Error('Not authorized')
    }

    return { userId: user.id, supabase: createAdminClient() }
}

function isUniqueViolation(error: { code?: string } | null): boolean {
    return error?.code === '23505'
}

/**
 * Find or create the 1:1 Claire thread for a student (`support`) or mentor
 * (`mentor_support`). Shared by all admins; unique indexes prevent duplicates.
 */
export async function ensureClaireThread(
    recipientId: string,
    role: 'student' | 'mentor'
): Promise<ClaireThread> {
    const { userId, supabase } = await requireAdmin()

    const { data: recipient, error: recipientError } = await supabase
        .from('profiles')
        .select('id, role')
        .eq('id', recipientId)
        .single()

    if (recipientError || !recipient || recipient.role !== role) {
        throw new Error(role === 'student' ? 'Student not found' : 'Mentor not found')
    }

    const type = role === 'student' ? 'support' : 'mentor_support'
    const matchColumn = role === 'student' ? 'student_id' : 'mentor_id'

    const { data: existing } = await supabase
        .from('conversations')
        .select('id, created_at, student_id, mentor_id, type')
        .eq(matchColumn, recipientId)
        .eq('type', type)
        .maybeSingle()

    if (existing) {
        return {
            conversationId: existing.id,
            adminId: userId,
            type,
            studentId: existing.student_id,
            mentorId: existing.mentor_id,
            createdAt: existing.created_at || new Date().toISOString(),
        }
    }

    const insertRow =
        role === 'student'
            ? {
                  student_id: recipientId,
                  mentor_id: null,
                  admin_id: userId,
                  type: 'support' as const,
              }
            : {
                  student_id: null,
                  mentor_id: recipientId,
                  admin_id: userId,
                  type: 'mentor_support' as const,
              }

    const { data: created, error } = await supabase
        .from('conversations')
        .insert(insertRow as never)
        .select('id, created_at, student_id, mentor_id, type')
        .single()

    if (created) {
        return {
            conversationId: created.id,
            adminId: userId,
            type,
            studentId: created.student_id,
            mentorId: created.mentor_id,
            createdAt: created.created_at || new Date().toISOString(),
        }
    }

    if (isUniqueViolation(error)) {
        const { data: raced } = await supabase
            .from('conversations')
            .select('id, created_at, student_id, mentor_id, type')
            .eq(matchColumn, recipientId)
            .eq('type', type)
            .maybeSingle()

        if (raced) {
            return {
                conversationId: raced.id,
                adminId: userId,
                type,
                studentId: raced.student_id,
                mentorId: raced.mentor_id,
                createdAt: raced.created_at || new Date().toISOString(),
            }
        }
    }

    throw new Error(error?.message || 'Failed to create conversation')
}

/**
 * Ensure the admin <-> mentor "support" conversation exists for a mentor and
 * return its id plus the current admin's user id. To the mentor these threads
 * render as coming from "Claire Marlowe" (the Access Oxbridge team).
 *
 * There is at most one mentor_support thread per mentor (shared by all admins),
 * enforced by a partial unique index.
 */
export async function ensureMentorSupportThread(mentorId: string): Promise<MentorSupportThread> {
    const thread = await ensureClaireThread(mentorId, 'mentor')
    return { conversationId: thread.conversationId, adminId: thread.adminId }
}

function sanitizeSearch(raw: string): string {
    return raw.replace(/[%_,()]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80)
}

type ProfileSnippet = {
    full_name?: string | null
    email?: string | null
    photo_url?: string | null
} | null

function oneProfile(value: ProfileSnippet | ProfileSnippet[]): ProfileSnippet {
    if (Array.isArray(value)) return value[0] ?? null
    return value
}

function asRecipient(
    id: string,
    profile: ProfileSnippet,
    role: 'student' | 'mentor',
    photoUrl?: string | null
): MessageRecipient {
    return {
        id,
        full_name: profile?.full_name ?? null,
        email: profile?.email ?? null,
        photo_url: photoUrl || profile?.photo_url || null,
        role,
    }
}

/**
 * Search students and mentors by name or email. An empty query returns a
 * short recent list so the compose modal is not blank on open.
 */
export async function searchMessageRecipients(query: string): Promise<MessageRecipient[]> {
    const { supabase } = await requireAdmin()
    const term = sanitizeSearch(query)

    if (!term) {
        const [{ data: studentRows }, { data: mentorRows }] = await Promise.all([
            supabase
                .from('student_profiles')
                .select(`
                    id,
                    profile:profiles!student_profiles_id_fkey (
                        full_name,
                        email,
                        photo_url
                    )
                `)
                .order('created_at', { ascending: false })
                .limit(8),
            supabase
                .from('mentors')
                .select(`
                    id,
                    photo_url,
                    profile:profiles!mentors_id_fkey (
                        full_name,
                        email,
                        photo_url
                    )
                `)
                .order('created_at', { ascending: false })
                .limit(8),
        ])

        const students = (studentRows || []).map((row) =>
            asRecipient(row.id, oneProfile(row.profile), 'student')
        )
        const mentors = (mentorRows || []).map((row) =>
            asRecipient(row.id, oneProfile(row.profile), 'mentor', row.photo_url)
        )
        return [...students, ...mentors]
    }

    const pattern = JSON.stringify(`%${term}%`)
    const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, photo_url, role')
        .in('role', ['student', 'mentor'])
        .or(`full_name.ilike.${pattern},email.ilike.${pattern}`)
        .limit(20)

    if (error) {
        throw new Error(error.message || 'Failed to search recipients')
    }

    const rows = profiles || []
    const mentorIds = rows.filter((p) => p.role === 'mentor').map((p) => p.id)
    const photoMap = new Map<string, string | null>()

    if (mentorIds.length > 0) {
        const { data: mentorPhotos } = await supabase
            .from('mentors')
            .select('id, photo_url')
            .in('id', mentorIds)

        for (const mentor of mentorPhotos || []) {
            photoMap.set(mentor.id, mentor.photo_url)
        }
    }

    return rows.map((profile) =>
        asRecipient(
            profile.id,
            profile,
            profile.role as 'student' | 'mentor',
            profile.role === 'mentor' ? photoMap.get(profile.id) : null
        )
    )
}
