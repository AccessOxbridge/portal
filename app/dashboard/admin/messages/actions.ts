'use server'

import {
    groupIntroBody,
    loadGroupMembers,
    participantSetKey,
    type ChatGroupMember,
} from '@/lib/chat-groups'
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

export interface GroupThread {
    conversationId: string
    adminId: string
    type: 'group'
    createdAt: string
    members: ChatGroupMember[]
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

async function membersForGroup(
    supabase: ReturnType<typeof createAdminClient>,
    conversationId: string
): Promise<ChatGroupMember[]> {
    const map = await loadGroupMembers(supabase, [conversationId])
    return map.get(conversationId) || []
}

/**
 * Current mentors assigned to a student. Used in group compose to offer
 * "Add their mentors" when the student has two or more.
 */
export async function getAssignedMentorsForStudent(
    studentId: string
): Promise<MessageRecipient[]> {
    const { supabase } = await requireAdmin()

    const { data: assignments, error } = await supabase
        .from('student_mentor_assignments')
        .select('mentor_id')
        .eq('student_id', studentId)
        .eq('is_current', true)

    if (error) {
        throw new Error(error.message || 'Failed to load assigned mentors')
    }

    const mentorIds = [...new Set((assignments || []).map((row) => row.mentor_id))]
    if (mentorIds.length === 0) return []

    const [{ data: profiles }, { data: mentorPhotos }] = await Promise.all([
        supabase.from('profiles').select('id, full_name, email, photo_url').in('id', mentorIds),
        supabase.from('mentors').select('id, photo_url').in('id', mentorIds),
    ])

    const photoMap = new Map((mentorPhotos || []).map((m) => [m.id, m.photo_url]))

    return (profiles || []).map((profile) =>
        asRecipient(profile.id, profile, 'mentor', photoMap.get(profile.id))
    )
}

/**
 * Find or create a group conversation for the given students and mentors.
 * Claire (the creating admin) is always added. The same non-admin set reopens
 * the existing room instead of creating a duplicate.
 */
export async function createGroupThread(participantIds: string[]): Promise<GroupThread> {
    const { userId, supabase } = await requireAdmin()

    const uniqueIds = [...new Set(participantIds.filter(Boolean))]
    if (uniqueIds.length < 2) {
        throw new Error('Pick at least two people for a group chat')
    }

    const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, role, full_name')
        .in('id', uniqueIds)

    if (profileError) {
        throw new Error(profileError.message || 'Failed to load people')
    }

    const byId = new Map((profiles || []).map((p) => [p.id, p]))
    if (byId.size !== uniqueIds.length) {
        throw new Error('One of the selected people could not be found')
    }

    const students: string[] = []
    const mentors: string[] = []
    for (const id of uniqueIds) {
        const role = byId.get(id)?.role
        if (role === 'student') students.push(id)
        else if (role === 'mentor') mentors.push(id)
        else throw new Error('Groups can only include students and mentors')
    }

    if (students.length < 1 || mentors.length < 1) {
        throw new Error('A group needs at least one student and one mentor')
    }

    if (students.length === 1 && mentors.length === 1) {
        throw new Error(
            "That's already a pair chat — assign the mentor on the Students page."
        )
    }

    if (students.length + mentors.length < 3) {
        throw new Error('A group needs at least three people besides Claire')
    }

    const setKey = participantSetKey([...students, ...mentors])

    const { data: existing } = await supabase
        .from('conversations')
        .select('id, created_at')
        .eq('type', 'group')
        .eq('participant_set_key', setKey)
        .maybeSingle()

    if (existing) {
        return {
            conversationId: existing.id,
            adminId: userId,
            type: 'group',
            createdAt: existing.created_at || new Date().toISOString(),
            members: await membersForGroup(supabase, existing.id),
        }
    }

    const { data: created, error: createError } = await supabase
        .from('conversations')
        .insert({
            student_id: null,
            mentor_id: null,
            admin_id: userId,
            type: 'group',
            participant_set_key: setKey,
        })
        .select('id, created_at')
        .single()

    if (isUniqueViolation(createError)) {
        const { data: raced } = await supabase
            .from('conversations')
            .select('id, created_at')
            .eq('type', 'group')
            .eq('participant_set_key', setKey)
            .maybeSingle()

        if (raced) {
            return {
                conversationId: raced.id,
                adminId: userId,
                type: 'group',
                createdAt: raced.created_at || new Date().toISOString(),
                members: await membersForGroup(supabase, raced.id),
            }
        }
    }

    if (!created) {
        throw new Error(createError?.message || 'Failed to create group')
    }

    const participantRows = [
        ...students.map((id) => ({
            conversation_id: created.id,
            user_id: id,
            role: 'student' as const,
        })),
        ...mentors.map((id) => ({
            conversation_id: created.id,
            user_id: id,
            role: 'mentor' as const,
        })),
        {
            conversation_id: created.id,
            user_id: userId,
            role: 'admin' as const,
        },
    ]

    const { error: memberError } = await supabase
        .from('conversation_participants')
        .insert(participantRows)

    if (memberError) {
        throw new Error(memberError.message || 'Failed to add people to the group')
    }

    const members = await membersForGroup(supabase, created.id)
    const intro = `[ADMIN] ${groupIntroBody(members)}`

    await supabase.from('messages').insert({
        conversation_id: created.id,
        sender_id: userId,
        content: intro,
    })

    await supabase
        .from('conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', created.id)

    return {
        conversationId: created.id,
        adminId: userId,
        type: 'group',
        createdAt: created.created_at || new Date().toISOString(),
        members,
    }
}
